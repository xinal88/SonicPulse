import {v2 as cloudinary} from 'cloudinary'
import mongoose from 'mongoose';
import songModel from '../models/songModel.js';
import artistModel from '../models/artistModel.js';
import albumModel from '../models/albumModel.js';
import genreModel from '../models/genreModel.js';
import { normalizeGenreName } from '../controllers/genreController.js';
import fs from 'fs/promises';
import axios from 'axios';
import ytdl from 'ytdl-core';
import { generateFingerprint, matchFingerprints } from '../utils/fingerprinting.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
// import { promises as fs } from 'fs';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Original Musicify controller functions
const addSong = async (req, res) => {
    try {
        const name = req.body.name;
        // Handle multiple artists
        let artistIds = [];
        if (req.body.artists) {
            // If artists is a string (single artist), convert to array
            if (typeof req.body.artists === 'string') {
                artistIds = [req.body.artists];
            } else {
                // If it's already an array
                artistIds = req.body.artists;
            }
        } else if (req.body.artist) {
            // For backward compatibility
            if (typeof req.body.artist === 'string') {
                artistIds = [req.body.artist];
            } else if (Array.isArray(req.body.artist)) {
                artistIds = req.body.artist;
            }
        }

        const album = req.body.album;
        const audioFile = req.files.audio[0];

        // Process genres
        let genres = [];
        if (req.body.genres) {
            // If genres is a string (single genre), convert to array
            if (typeof req.body.genres === 'string') {
                genres = [req.body.genres];
            } else {
                // If it's already an array
                genres = req.body.genres;
            }
        }

        // Process new genres that need to be created
        if (req.body.newGenres) {
            const newGenreNames = Array.isArray(req.body.newGenres)
                ? req.body.newGenres
                : [req.body.newGenres];
            
            for (const genreName of newGenreNames) {
                // Normalize the genre name for comparison
                const normalizedName = normalizeGenreName(genreName);
                
                // Check if this genre already exists (case-insensitive)
                const existingGenre = await genreModel.findOne({
                    name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
                });

                if (existingGenre) {
                    // If it exists, add its ID to the genres array if not already there
                    if (!genres.includes(existingGenre._id.toString())) {
                        genres.push(existingGenre._id.toString());
                    }
                } else {
                    // Create new genre with the original name (trimmed)
                    const newGenre = new genreModel({ name: genreName.trim() });
                    await newGenre.save();
                    genres.push(newGenre._id.toString());
                }
            }
        }

        // Upload audio to cloudinary
        const audioUpload = await cloudinary.uploader.upload(audioFile.path, {resource_type:"video"});
        const duration = `${Math.floor(audioUpload.duration/60)}:${Math.floor(audioUpload.duration%60)}`;

        // Initialize image URL
        let imageUrl = "";

        // Check if we should use the album image
        if (req.body.useAlbumImage === 'true' && req.body.albumId) {
            // Get the album image URL from the database
            const albumData = await albumModel.findById(req.body.albumId);

            if (albumData && albumData.image) {
                imageUrl = albumData.image;
            } else {
                // If album not found or no image, return error
                return res.json({success: false, message: "Album image not found"});
            }
        } else if (req.files.image && req.files.image[0]) {
            // Use the uploaded image
            const imageFile = req.files.image[0];
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});
            imageUrl = imageUpload.secure_url;
        } else {
            // No image provided
            return res.json({success: false, message: "Image is required"});
        }

        // Initialize lrcFile URL
        let lrcFileUrl = "";

        // Check if LRC file was uploaded
        if (req.files.lrc && req.files.lrc[0]) {
            try {
                // Upload LRC file to Cloudinary as a raw file
                const lrcFile = req.files.lrc[0];
                const lrcUpload = await cloudinary.uploader.upload(lrcFile.path, {
                    resource_type: "raw",
                    format: "txt" // Ensure it's treated as text
                });

                // Store the secure URL of the LRC file
                lrcFileUrl = lrcUpload.secure_url;

                console.log(`LRC file uploaded to: ${lrcFileUrl}`);
            } catch (lrcError) {
                console.error("Error uploading LRC file:", lrcError);
                // Continue without LRC file if there's an error
            }
        }

        // Get artist names from artist IDs
        let artistNames = [];
        let artistName = ""; // Combined artist names for display

        try {
            // Find all artists by their IDs
            const artistDocs = await artistModel.find({ _id: { $in: artistIds } });

            // Extract names
            artistNames = artistDocs.map(doc => doc.name);

            // Join names for display (e.g., "Artist1, Artist2, Artist3")
            artistName = artistNames.join(", ");
        } catch (error) {
            console.error("Error finding artists:", error);
            // Continue with empty artist names if there's an error
        }

        // Log song data for debugging
        console.log("Adding song with data:", {
            name,
            artistIds,
            artistName,
            album,
            genresCount: genres.length
        });

        const songData = {
            name,
            artist: artistIds, // Store array of artist IDs
            artistName, // Store concatenated artist names for display
            album,
            image: imageUrl,
            file: audioUpload.secure_url,
            duration,
            lrcFile: lrcFileUrl,
            genres, // Add genres array
            fingerprints: [] // Initialize empty fingerprints array
        }

        // Handle YouTube URL and fingerprinting if provided
        if (req.body.youtubeUrl) {
            try {
                // Validate YouTube URL
                if (ytdl.validateURL(req.body.youtubeUrl)) {
                    // Extract video ID from URL
                    const videoId = ytdl.getURLVideoID(req.body.youtubeUrl);
                    songData.youtubeId = videoId;
                    songData.youtubeUrl = req.body.youtubeUrl;
                    
                    // Generate fingerprints if requested
                    if (req.body.generateFingerprint === 'true') {
                        try {
                            console.log("Generating fingerprints for audio file...");
                            
                            // Read the audio file
                            const audioData = await fs.readFile(audioFile.path);
                            const audioDecode = (await import('audio-decode')).default;
                            
                            try {
                                const decodedAudio = await audioDecode(audioData);
                                
                                // Use the first channel if stereo, or the only channel if mono
                                const samples = decodedAudio.numberOfChannels > 1 
                                    ? decodedAudio.getChannelData(0) 
                                    : decodedAudio.getChannelData(0);
                                    
                                // Generate fingerprints
                                const fingerprints = generateFingerprint(samples);
                                console.log(`Generated ${fingerprints.length} fingerprints`);
                                songData.fingerprints = fingerprints;
                            } catch (decodeError) {
                                console.error("Error decoding audio:", decodeError);
                                // Continue without fingerprints if decoding fails
                            }
                        } catch (fingerprintError) {
                            console.error("Error generating fingerprints:", fingerprintError);
                            // Continue with song creation even if fingerprinting fails
                        }
                    }
                }
            } catch (error) {
                console.error("Error processing YouTube URL:", error);
                // Continue with song creation even if YouTube processing fails
            }
        }

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Save the song within the transaction
            const song = new songModel(songData);
            const savedSong = await song.save({ session });

            // Update genres for all artists and update genre songList and songCount
            if (genres.length > 0) {
                // Update each genre's songList and songCount
                const genreUpdatePromises = genres.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $addToSet: { songList: savedSong._id },
                            $inc: { songCount: 1 }
                        },
                        { session, new: true }
                    )
                );

                await Promise.all(genreUpdatePromises);

                // Update each artist's genres
                if (artistIds.length > 0) {
                    const artistUpdatePromises = artistIds.map(async artistId => {
                        const artist = await artistModel.findById(artistId).session(session);
                        if (artist) {
                            // Create a set of unique genre IDs
                            const uniqueGenres = new Set([
                                ...(artist.genres || []).map(g => g.toString()),
                                ...genres
                            ]);

                            return artistModel.findByIdAndUpdate(
                                artistId,
                                { genres: Array.from(uniqueGenres) },
                                { session, new: true }
                            );
                        }
                    });

                    await Promise.all(artistUpdatePromises.filter(p => p)); // Filter out undefined promises
                }
            }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            console.log(`Song "${savedSong.name}" added successfully with ${genres.length} genres`);

        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            console.error("Transaction aborted:", error);
            throw error; // Re-throw to be caught by the outer try-catch
        }

        res.json({success:true, message:"Song Added"})
    } catch (error) {
        console.error("Error in addSong: ", error);
        res.json({success:false})
    }
}

const listSong = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        // If search parameter is provided, search by song name, album name, or artist name
        if (search) {
            // Create a query that searches across multiple fields
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },         // Search by song name
                    { album: { $regex: search, $options: 'i' } },        // Search by album name
                    { artistName: { $regex: search, $options: 'i' } }    // Search by artist name
                ]
            };
        }

        // Find songs based on the query
        const allSongs = await songModel.find(query);

        // Log the number of songs and whether they have genres
        console.log(`Found ${allSongs.length} songs`);
        if (allSongs.length > 0) {
            const songsWithGenres = allSongs.filter(song => song.genres && song.genres.length > 0);
            console.log(`${songsWithGenres.length} songs have genres`);
        }

        res.json({success:true, songs: allSongs});
    } catch (error) {
        console.error("Error listing songs:", error);
        res.json({success: false});
    }
}

const removeSong = async (req, res) => {
    try {
        const songId = req.body.id;
        console.log("Removing song with ID:", songId);

        // Get the song's genres and artist info before deleting
        const song = await songModel.findById(songId);
        if (!song) {
            return res.json({success: false, message: "Song not found"});
        }

        const genreIds = song.genres.map(g => g.toString());
        const artistIds = Array.isArray(song.artist) ? song.artist.map(a => a.toString()) : [];

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Delete the song within the transaction
            await songModel.findByIdAndDelete(songId).session(session);

            // Update genre collections
            if (genreIds.length > 0) {
                // Remove song from all its genres
                const genreUpdatePromises = genreIds.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $pull: { songList: songId },
                            $inc: { songCount: -1 }
                        },
                        { session, new: true }
                    )
                );

                await Promise.all(genreUpdatePromises);
                console.log(`Removed song from ${genreIds.length} genres`);
            }

            // Update artist genre lists if needed
            // This is more complex as we need to check if any other songs by this artist
            // still have these genres
            if (artistIds.length > 0 && genreIds.length > 0) {
                for (const artistId of artistIds) {
                    // For each artist, get all their songs except the one being deleted
                    const artistSongs = await songModel.find({
                        artist: artistId,
                        _id: { $ne: songId }
                    }).session(session);

                    // Collect all genres used by the artist's remaining songs
                    const remainingGenres = new Set();
                    artistSongs.forEach(song => {
                        if (song.genres && song.genres.length > 0) {
                            song.genres.forEach(genreId => {
                                remainingGenres.add(genreId.toString());
                            });
                        }
                    });

                    // Update the artist's genres to only include those still in use
                    await artistModel.findByIdAndUpdate(
                        artistId,
                        { genres: Array.from(remainingGenres) },
                        { session, new: true }
                    );
                }
            }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            console.log(`Song "${song.name}" removed successfully`);
            res.json({success: true, message: "Song removed"});

        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            console.error("Transaction aborted:", error);
            res.json({success: false, message: "Error removing song"});
        }
    } catch (error) {
        console.error("Error in removeSong:", error);
        res.json({success: false, message: "Error removing song"});
    }
}

const updateSong = async (req, res) => {
    try {
        const { id } = req.body;
        const name = req.body.name;

        // Handle multiple artists
        let artistIds = [];
        if (req.body.artists) {
            // If artists is a string (single artist), convert to array
            if (typeof req.body.artists === 'string') {
                artistIds = [req.body.artists];
            } else {
                // If it's already an array
                artistIds = req.body.artists;
            }
        } else if (req.body.artist) {
            // For backward compatibility
            if (typeof req.body.artist === 'string') {
                artistIds = [req.body.artist];
            } else if (Array.isArray(req.body.artist)) {
                artistIds = req.body.artist;
            }
        }

        const album = req.body.album;

        // Process genres
        let genres = [];
        if (req.body.genres) {
            // If genres is a string (single genre), convert to array
            if (typeof req.body.genres === 'string') {
                genres = [req.body.genres];
            } else {
                // If it's already an array
                genres = req.body.genres;
            }
        }

        // Process new genres that need to be created
        if (req.body.newGenres) {
            const newGenreNames = Array.isArray(req.body.newGenres)
                ? req.body.newGenres
                : [req.body.newGenres];

            for (const genreName of newGenreNames) {
                if (!genreName || genreName.trim() === '') {
                    continue; // Skip empty genre names
                }

                // Normalize the genre name for comparison
                const normalizedName = normalizeGenreName(genreName);

                if (normalizedName === '') {
                    continue; // Skip if normalization results in empty string
                }

                // Get all genres and check if any normalized name matches
                const allGenres = await genreModel.find();

                // Find a matching genre by normalized name
                const existingGenre = allGenres.find(genre =>
                    normalizeGenreName(genre.name) === normalizedName
                );

                if (existingGenre) {
                    // If it exists, add its ID to the genres array if not already there
                    if (!genres.includes(existingGenre._id.toString())) {
                        genres.push(existingGenre._id.toString());
                    }
                } else {
                    // Create new genre with the original name (trimmed)
                    const newGenre = new genreModel({ name: genreName.trim() });
                    await newGenre.save();
                    genres.push(newGenre._id.toString());
                }
            }
        }

        // Get artist names from artist IDs
        let artistNames = [];
        let artistName = ""; // Combined artist names for display

        try {
            // Find all artists by their IDs
            const artistDocs = await artistModel.find({ _id: { $in: artistIds } });

            // Extract names
            artistNames = artistDocs.map(doc => doc.name);

            // Join names for display (e.g., "Artist1, Artist2, Artist3")
            artistName = artistNames.join(", ");
        } catch (error) {
            console.error("Error finding artists:", error);
            // Continue with empty artist names if there's an error
        }

        // Create update data object
        const updateData = {
            name,
            artist: artistIds, // Store array of artist IDs
            artistName,
            album,
            genres // Always include genres array, even if empty
        };

        // Handle YouTube URL if provided
        if (req.body.youtubeUrl) {
            try {
                // Validate YouTube URL
                if (ytdl.validateURL(req.body.youtubeUrl)) {
                    // Extract video ID from URL
                    const videoId = ytdl.getURLVideoID(req.body.youtubeUrl);
                    updateData.youtubeId = videoId;
                    updateData.youtubeUrl = req.body.youtubeUrl;
                    
                    // If generateFingerprint flag is set and we have an audio file, generate fingerprints
                    if (req.body.generateFingerprint === 'true' && req.files && req.files.audio) {
                        const audioPath = req.files.audio[0].path;
                        
                        try {
                            // Read the audio file
                            const audioData = await fs.readFile(audioPath);
                            const audioDecode = (await import('audio-decode')).default;
                            const decodedAudio = await audioDecode(audioData);
                            
                            // Use the first channel if stereo, or the only channel if mono
                            const samples = decodedAudio.numberOfChannels > 1 
                                ? decodedAudio.getChannelData(0) 
                                : decodedAudio.getChannelData(0);
                                
                            // Generate fingerprints
                            const fingerprints = generateFingerprint(samples);
                            updateData.fingerprints = fingerprints;
                            
                            // Update duration if not already set
                            if (!updateData.duration) {
                                updateData.duration = `${Math.floor(decodedAudio.duration/60)}:${Math.floor(decodedAudio.duration%60).toString().padStart(2, '0')}`;
                            }
                        } catch (fingerprintError) {
                            console.error("Error generating fingerprints:", fingerprintError);
                            // Continue with song update even if fingerprinting fails
                        }
                    }
                }
            } catch (youtubeError) {
                console.error("Error processing YouTube URL:", youtubeError);
                // Continue with song update even if YouTube processing fails
            }
        }

        // If using album image
        if (req.body.useAlbumImage === 'true' && req.body.albumId) {
            // Get the album image URL from the database
            const albumData = await albumModel.findById(req.body.albumId);

            if (albumData && albumData.image) {
                updateData.image = albumData.image;
            } else {
                // If album not found or no image, return error
                return res.json({success: false, message: "Album image not found"});
            }
        }
        // If new files are uploaded, process them
        else if (req.files) {
            // Handle image update if provided
            if (req.files.image && req.files.image[0]) {
                const imageFile = req.files.image[0];
                const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});
                updateData.image = imageUpload.secure_url;
            }

            // Handle audio update if provided
            if (req.files.audio && req.files.audio[0]) {
                const audioFile = req.files.audio[0];
                const audioUpload = await cloudinary.uploader.upload(audioFile.path, {resource_type:"video"});
                updateData.file = audioUpload.secure_url;
                updateData.duration = `${Math.floor(audioUpload.duration/60)}:${Math.floor(audioUpload.duration%60)}`;
            }

            // Handle LRC file update if provided
            if (req.files.lrc && req.files.lrc[0]) {
                try {
                    const lrcFile = req.files.lrc[0];
                    const lrcUpload = await cloudinary.uploader.upload(lrcFile.path, {
                        resource_type: "raw",
                        format: "txt"
                    });
                    updateData.lrcFile = lrcUpload.secure_url;
                } catch (lrcError) {
                    console.error("Error uploading LRC file:", lrcError);
                }
            }
        }

        // Log the update data for debugging
        console.log("Updating song with data:", {
            id,
            name: updateData.name,
            artist: updateData.artist,
            album: updateData.album,
            genresCount: updateData.genres.length
        });

        // Get the song's current genres and artists before updating
        const currentSong = await songModel.findById(id);
        if (!currentSong) {
            return res.json({success: false, message: "Song not found"});
        }

        const oldGenres = currentSong.genres.map(g => g.toString());
        const oldArtistIds = Array.isArray(currentSong.artist) ? currentSong.artist.map(a => a.toString()) : [];

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Update the song in the database within the transaction
            await songModel.findByIdAndUpdate(id, updateData, { session });

            // Handle genre updates
            // Find genres that were removed
            const removedGenres = oldGenres.filter(g => !genres.includes(g));

            // Find genres that were added
            const addedGenres = genres.filter(g => !oldGenres.includes(g));

            // Process removed genres
            if (removedGenres.length > 0) {
                const removeGenrePromises = removedGenres.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $pull: { songList: id },
                            $inc: { songCount: -1 }
                        },
                        { session, new: true }
                    )
                );

                await Promise.all(removeGenrePromises);
                console.log(`Removed song from ${removedGenres.length} genres`);
            }

            // Process added genres
            if (addedGenres.length > 0) {
                const addGenrePromises = addedGenres.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $addToSet: { songList: id },
                            $inc: { songCount: 1 }
                        },
                        { session, new: true }
                    )
                );

                await Promise.all(addGenrePromises);
                console.log(`Added song to ${addedGenres.length} genres`);
            }

            // Handle artist updates
            // Find artists that were removed
            const removedArtists = oldArtistIds.filter(a => !artistIds.includes(a));

            // Find artists that were added
            const addedArtists = artistIds.filter(a => !oldArtistIds.includes(a));

            // Update removed artists' genres
            if (removedArtists.length > 0) {
                for (const artistId of removedArtists) {
                    // For each artist, get all their songs except the one being updated
                    const artistSongs = await songModel.find({
                        artist: artistId,
                        _id: { $ne: id }
                    }).session(session);

                    // Collect all genres used by the artist's remaining songs
                    const remainingGenres = new Set();
                    artistSongs.forEach(song => {
                        if (song.genres && song.genres.length > 0) {
                            song.genres.forEach(genreId => {
                                remainingGenres.add(genreId.toString());
                            });
                        }
                    });

                    // Update the artist's genres to only include those still in use
                    await artistModel.findByIdAndUpdate(
                        artistId,
                        { genres: Array.from(remainingGenres) },
                        { session, new: true }
                    );
                }
            }

            // Update added artists' genres
            if (addedArtists.length > 0) {
                for (const artistId of addedArtists) {
                    const artist = await artistModel.findById(artistId).session(session);
                    if (artist) {
                        // Create a set of unique genre IDs
                        const uniqueGenres = new Set([
                            ...(artist.genres || []).map(g => g.toString()),
                            ...genres
                        ]);

                        // Update artist with unique genres
                        await artistModel.findByIdAndUpdate(
                            artistId,
                            { genres: Array.from(uniqueGenres) },
                            { session, new: true }
                        );
                    }
                }
            }

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            console.log(`Song "${updateData.name}" updated successfully`);

        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            console.error("Transaction aborted:", error);
            throw error; // Re-throw to be caught by the outer try-catch
        }

        res.json({success: true, message: "Song updated"});
    } catch (error) {
        console.error("Error updating song:", error);
        res.status(500).json({
            success: false,
            message: "Error updating song",
            error: error.message
        });
    }
}

// Added controller functions from SeekTune
const uploadSong = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No audio file provided' });
    }

    // Decode audio file using audio-decode
    const audioData = await fs.readFile(req.file.path);
    const audioDecode = (await import('audio-decode')).default;
    const decodedAudio = await audioDecode(audioData);
    
    // Use the first channel if stereo, or the only channel if mono
    const samples = decodedAudio.numberOfChannels > 1 ? decodedAudio.getChannelData(0) : decodedAudio.getChannelData(0);
    const fingerprints = generateFingerprint(samples);

    // Upload to Cloudinary
    const cloudinaryResult = await cloudinary.uploader.upload(req.file.path, {
      resource_type: 'auto',
      folder: 'seek-tune/audio'
    });

    const song = new songModel({
      name: req.body.title,
      artist: req.body.artist ? [req.body.artist] : [],
      artistName: req.body.artist,
      album: req.body.album || 'Unknown',
      image: req.body.image || 'https://placeholder.com/image',
      file: cloudinaryResult.secure_url,
      duration: `${Math.floor(decodedAudio.duration/60)}:${Math.floor(decodedAudio.duration%60)}`,
      fingerprints: fingerprints
    });

    // Clean up temporary file
    await fs.unlink(req.file.path);

    // Try to find YouTube ID if title and artist are provided
    if (req.body.title && req.body.artist) {
      const videoId = await findYouTubeId(`${req.body.title} ${req.body.artist}`);
      if (videoId) {
        song.youtubeId = videoId;
      }
    }

    await song.save();
    res.status(201).json(song);
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading song' });
  }
};

/**
 * Find matches for an audio sample using fingerprinting
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const findMatches = async (req, res) => {
    console.log("findMatches called");
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No audio sample provided' });
        }

        console.log("File received:", req.file.originalname, req.file.mimetype, req.file.size);
        
        // Set a timeout for the entire operation
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Audio processing timed out')), 30000) // 30 second timeout
        );
        
        // Main processing function
        const processAudio = async () => {
            try {
                // Read the audio file
                console.log("Reading file...");
                const audioData = await fs.readFile(req.file.path);
                console.log("File read successfully, size:", audioData.length);
                
                // Try to determine the audio format
                const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
                console.log("File extension:", fileExtension);
                console.log("MIME type:", req.file.mimetype);
                
                // Handle WebM format from browser recordings
                if (req.file.mimetype.includes('webm')) {
                    try {
                        console.log("Detected WebM format from browser recording");
                        
                        // Convert WebM to WAV using ffmpeg
                        const inputPath = req.file.path;
                        const outputPath = `${req.file.path}.wav`;
                        
                        console.log(`Converting WebM to WAV: ${inputPath} -> ${outputPath}`);
                        
                        // Create a promise to handle the ffmpeg conversion
                        await new Promise((resolve, reject) => {
                            ffmpeg(inputPath)
                                .outputOptions('-ac 1') // Convert to mono
                                .outputOptions('-ar 44100') // Set sample rate to 44.1kHz
                                .save(outputPath)
                                .on('end', () => {
                                    console.log('WebM to WAV conversion complete');
                                    resolve();
                                })
                                .on('error', (err) => {
                                    console.error('Error converting WebM to WAV:', err);
                                    reject(err);
                                });
                        });
                        
                        // Now read and process the WAV file
                        console.log("Reading converted WAV file...");
                        const wavData = await fs.readFile(outputPath);
                        
                        // Use node-wav to decode the WAV file
                        console.log("Decoding WAV file...");
                        const nodeWav = await import('node-wav');
                        const wavDecoded = nodeWav.default.decode(wavData);
                        
                        // Process the decoded audio
                        console.log("Processing audio data...");
                        const samples = wavDecoded.channelData[0];
                        
                        console.log("Generating fingerprints...");
                        const fingerprints = generateFingerprint(samples);
                        console.log(`Generated ${fingerprints.length} fingerprints`);
                        
                        // Find matches in database
                        console.log("Finding matches in database...");
                        const songs = await songModel.find({ fingerprints: { $exists: true, $ne: [] } });
                        console.log(`Found ${songs.length} songs with fingerprints in database`);
                        
                        if (songs.length === 0) {
                            return res.json({ 
                                success: false, 
                                message: 'No songs with fingerprints found in the database. Please add songs with audio first.'
                            });
                        }
                        
                        const matches = [];
                        for (const song of songs) {
                            // Verify song has valid fingerprints
                            if (!song.fingerprints || song.fingerprints.length === 0) {
                                continue; // Skip songs without fingerprints
                            }
                            
                            console.log(`Comparing with song: ${song.name}`);
                            const result = matchFingerprints(fingerprints, song.fingerprints);
                            
                            // Only include matches with reasonable confidence
                            if (result.length > 0 && result[0].confidence >= 0.1) {
                                matches.push({
                                    songId: song._id,
                                    name: song.name,
                                    artist: song.artistName,
                                    album: song.album,
                                    image: song.image,
                                    confidence: Math.round(result[0].confidence * 100) // Convert to percentage
                                });
                            }
                        }
                        
                        // Clean up the temporary WAV file
                        try {
                            await fs.unlink(outputPath);
                            console.log("Temporary WAV file cleaned up");
                        } catch (cleanupError) {
                            console.error("Error cleaning up temporary WAV file:", cleanupError);
                        }
                        
                        console.log(`Found ${matches.length} potential matches`);
                        // First sort by confidence
                        const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);

                        // Check if any matches meet the threshold
                        const highConfidenceMatches = sortedMatches.filter(match => match.confidence >= 75);

                        // Return either high confidence matches or top 3 regardless
                        return res.json({ 
                            success: true, 
                            matches: highConfidenceMatches.length > 0
                                ? highConfidenceMatches.slice(0, 3)  // Return up to 3 high confidence matches
                                : sortedMatches.slice(0, 3)          // Return top 3 regardless of confidence
                        });
                    } catch (webmError) {
                        console.error("Error processing WebM:", webmError);
                        // Fall through to try other methods
                    }
                }
                
                // Try using node-wav for WAV files
                if (fileExtension === 'wav' || req.file.mimetype.includes('wav')) {
                    try {
                        console.log("Attempting to decode with node-wav...");
                        const nodeWav = await import('node-wav');
                        const wavData = nodeWav.default.decode(audioData);
                        console.log("WAV decode successful!");
                        
                        // Process the decoded audio
                        console.log("Processing audio data...");
                        // Use the first channel
                        const samples = wavData.channelData[0];
                        
                        console.log("Generating fingerprints...");
                        const fingerprints = generateFingerprint(samples);
                        console.log(`Generated ${fingerprints.length} fingerprints`);
                        
                        // Find matches in database
                        console.log("Finding matches in database...");
                        const songs = await songModel.find({ fingerprints: { $exists: true, $ne: [] } });
                        console.log(`Found ${songs.length} songs with fingerprints in database`);
                        
                        if (songs.length === 0) {
                            return res.json({ 
                                success: false, 
                                message: 'No songs with fingerprints found in the database. Please add songs with audio first.'
                            });
                        }
                        
                        const matches = [];
                        for (const song of songs) {
                            // Verify song has valid fingerprints
                            if (!song.fingerprints || song.fingerprints.length === 0) {
                                continue; // Skip songs without fingerprints
                            }
                            
                            console.log(`Comparing with song: ${song.name}`);
                            const result = matchFingerprints(fingerprints, song.fingerprints);
                            
                            // Only include matches with reasonable confidence (between 0.1 and 0.99)
                            if (result.length > 0 && result[0].confidence >= 0.1 && result[0].confidence <= 0.99) {
                                matches.push({
                                    songId: song._id,
                                    name: song.name,
                                    artist: song.artistName,
                                    album: song.album,
                                    image: song.image,
                                    confidence: Math.round(result[0].confidence * 100) // Convert to percentage
                                });
                            }
                        }
                        
                        console.log(`Found ${matches.length} potential matches`);
                        return res.json({ 
                            success: true, 
                            matches: matches.sort((a, b) => b.confidence - a.confidence) 
                        });
                    } catch (wavError) {
                        console.error("Error decoding with node-wav:", wavError);
                        // Fall through to try audio-decode
                    }
                }
                
                // Try audio-decode as fallback
                try {
                    console.log("Attempting direct decode with audio-decode...");
                    const audioDecode = (await import('audio-decode')).default;
                    const decodedAudio = await audioDecode(audioData);
                    console.log("Direct decode successful!");
                    
                    // Process the decoded audio
                    console.log("Processing audio data...");
                    const samples = decodedAudio.numberOfChannels > 1 
                        ? decodedAudio.getChannelData(0) 
                        : decodedAudio.getChannelData(0);
                    
                    console.log("Generating fingerprints...");
                    const fingerprints = generateFingerprint(samples);
                    console.log(`Generated ${fingerprints.length} fingerprints`);
                    
                    // Find matches in database
                    console.log("Finding matches in database...");
                    const songs = await songModel.find({ fingerprints: { $exists: true, $ne: [] } });
                    console.log(`Found ${songs.length} songs with fingerprints in database`);
                    
                    if (songs.length === 0) {
                        return res.json({ 
                            success: false, 
                            message: 'No songs with fingerprints found in the database. Please add songs with audio first.'
                        });
                    }
                    
                    const matches = [];
                    for (const song of songs) {
                        // Verify song has valid fingerprints
                        if (!song.fingerprints || song.fingerprints.length === 0) {
                            continue; // Skip songs without fingerprints
                        }
                        
                        console.log(`Comparing with song: ${song.name}`);
                        const result = matchFingerprints(fingerprints, song.fingerprints);
                        
                        // Only include matches with reasonable confidence (between 0.1 and 0.99)
                        if (result.length > 0 && result[0].confidence >= 0.1 && result[0].confidence <= 0.99) {
                            matches.push({
                                songId: song._id,
                                name: song.name,
                                artist: song.artistName,
                                album: song.album,
                                image: song.image,
                                confidence: Math.round(result[0].confidence * 100) // Convert to percentage
                            });
                        }
                    }
                    
                    console.log(`Found ${matches.length} potential matches`);
                    return res.json({ 
                        success: true, 
                        matches: matches.sort((a, b) => b.confidence - a.confidence) 
                    });
                    
                } catch (decodeError) {
                    console.error("Error decoding audio:", decodeError);
                    
                    // If all decoding methods fail, return a fallback response with some songs
                    console.log("All decoding methods failed, returning fallback response");
                    const songs = await songModel.find({ fingerprints: { $exists: true, $ne: [] } }).limit(5);
                    const fallbackMatches = songs.map(song => ({
                        songId: song._id,
                        name: song.name,
                        artist: song.artistName,
                        album: song.album,
                        image: song.image,
                        score: 0.1 // Low confidence score
                    }));
                    
                    return res.json({ 
                        success: true, 
                        matches: fallbackMatches,
                        message: 'Could not analyze audio precisely. Showing some suggestions instead.'
                    });
                }
            } catch (error) {
                console.error("Error in audio processing:", error);
                return res.json({ 
                    success: false, 
                    message: 'Error processing audio' 
                });
            }
        };
        
        // Race the processing against the timeout
        await Promise.race([processAudio(), timeoutPromise]);
        
    } catch (error) {
        console.error("Error finding matches:", error);
        return res.json({ 
            success: false, 
            message: error.message || 'Server error processing audio' 
        });
    } finally {
        // Clean up the temporary file
        if (req.file && req.file.path) {
            try {
                await fs.unlink(req.file.path);
                console.log("Temporary file cleaned up");
            } catch (cleanupError) {
                console.error("Error cleaning up temporary file:", cleanupError);
            }
        }
    }
};

const downloadSong = async (req, res) => {
  try {
    const { youtubeUrl } = req.body;
    
    if (!youtubeUrl) {
      return res.status(400).json({ 
        success: false,
        message: 'YouTube URL is required' 
      });
    }

    console.log("Processing YouTube URL:", youtubeUrl);

    // Basic URL validation before passing to ytdl
    if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid YouTube URL format' 
      });
    }

    try {
      // Extract video ID manually for more reliable processing
      let videoId = '';
      if (youtubeUrl.includes('youtube.com/watch?v=')) {
        videoId = new URL(youtubeUrl).searchParams.get('v');
      } else if (youtubeUrl.includes('youtu.be/')) {
        videoId = youtubeUrl.split('youtu.be/')[1].split('?')[0];
      } else if (youtubeUrl.includes('youtube.com/embed/')) {
        videoId = youtubeUrl.split('youtube.com/embed/')[1].split('?')[0];
      }

      if (!videoId) {
        return res.status(400).json({
          success: false,
          message: 'Could not extract video ID from URL'
        });
      }

      console.log("Extracted video ID:", videoId);

      // Mock response for testing - this will bypass ytdl-core
      // Remove this section once you confirm the route is working
      return res.status(200).json({
        success: true,
        videoId: videoId,
        title: "Sample Title",
        artist: "Sample Artist",
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
        duration: "180"
      });

      // The code below will be used once we confirm the route is working
      /*
      // Get video info using ytdl
      const info = await ytdl.getInfo(videoId);
      const videoDetails = info.videoDetails;
      
      // Extract title and artist
      let title = videoDetails.title;
      let artist = '';
      
      // Try to extract artist from title (common format: "Artist - Title")
      if (title.includes(' - ')) {
        const parts = title.split(' - ');
        artist = parts[0].trim();
        title = parts[1].trim();
      } else if (videoDetails.author && videoDetails.author.name) {
        // Use channel name as artist if no better option
        artist = videoDetails.author.name.replace(' - Topic', '').trim();
      }
      
      // Return the extracted info
      return res.status(200).json({
        success: true,
        videoId: videoDetails.videoId,
        title,
        artist,
        thumbnailUrl: videoDetails.thumbnails[0]?.url || '',
        duration: videoDetails.lengthSeconds
      });
      */
    } catch (ytdlError) {
      console.error("ytdl-core error:", ytdlError);
      
      // If ytdl fails, try a simpler approach with just the video ID
      try {
        const videoId = youtubeUrl.includes('v=') 
          ? youtubeUrl.split('v=')[1].split('&')[0]
          : youtubeUrl.split('/').pop().split('?')[0];
          
        return res.status(200).json({
          success: true,
          videoId: videoId,
          title: "Unknown Title",
          artist: "Unknown Artist",
          thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
          duration: "0"
        });
      } catch (fallbackError) {
        throw new Error(`Failed to process YouTube URL: ${ytdlError.message}`);
      }
    }
  } catch (error) {
    console.error('YouTube download error:', error);
    return res.status(500).json({ 
      success: false,
      message: 'Error processing YouTube URL',
      error: error.message || 'Unknown error'
    });
  }
};

// Helper function to find YouTube video ID
const findYouTubeId = async (searchQuery) => {
  try {
    const API_KEY = process.env.YOUTUBE_API_KEY;
    if (!API_KEY) {
      console.warn('YouTube API key not found in environment variables');
      return null;
    }
    
    const response = await axios.get('https://www.googleapis.com/youtube/v3/search', {
      params: {
        part: 'snippet',
        maxResults: 1,
        q: searchQuery,
        key: API_KEY
      }
    });
    
    if (response.data.items && response.data.items.length > 0) {
      return response.data.items[0].id.videoId;
    }
    return null;
  } catch (error) {
    console.error('YouTube API error:', error);
    return null;
  }
};

// Helper function to generate simple fingerprints for formats that can't be decoded
function generateSimpleFingerprints(audioData) {
    // This is a very simplified approach
    // In a real implementation, you'd want to use a proper audio fingerprinting algorithm
    const fingerprints = [];
    
    // Create simple fingerprints based on byte patterns
    // This won't be accurate but provides a fallback
    for (let i = 0; i < audioData.length - 1024; i += 1024) {
        const chunk = audioData.slice(i, i + 1024);
        let sum = 0;
        for (let j = 0; j < chunk.length; j++) {
            sum += chunk[j];
        }
        fingerprints.push({
            time: i / 1024,
            hash: sum % 1000000 // Simple hash
        });
    }
    
    return fingerprints;
}

export {
  addSong, 
  listSong, 
  removeSong, 
  updateSong, 
  uploadSong, 
  findMatches, 
  downloadSong}
