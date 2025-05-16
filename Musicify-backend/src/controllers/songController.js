import {v2 as cloudinary} from 'cloudinary'
import mongoose from 'mongoose';
import songModel from '../models/songModel.js';
import artistModel from '../models/artistModel.js';
import albumModel from '../models/albumModel.js';
import genreModel from '../models/genreModel.js';
import { normalizeGenreName } from '../controllers/genreController.js';

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
            genres // Add genres array
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
        res.json({success: false});
    }
}

export {addSong, listSong, removeSong, updateSong}