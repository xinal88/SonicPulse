import mongoose from 'mongoose';
import songModel from '../models/songModel.js';
import artistModel from '../models/artistModel.js';
import albumModel from '../models/albumModel.js';
import genreModel from '../models/genreModel.js';
import fs from 'fs/promises';
import axios from 'axios';
import ytdl from 'ytdl-core';
import { generateFingerprint, matchFingerprints } from '../utils/fingerprinting.js';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { convertToArray, handleNewGenres, getArtistNames } from '../utils/songUtils.js';
import { uploadAudioFile, uploadImageFile, uploadLrcFile } from '../utils/uploadUtils.js';
import { executeTransaction } from '../utils/transactionUtils.js';

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegStatic);

const addSong = async (req, res) => {
    try {
        const name = req.body.name;
        const artistIds = convertToArray(req.body.artists) || convertToArray(req.body.artist);
        const album = req.body.album;
        
        // Process genres
        let genres = convertToArray(req.body.genres);
        const newGenres = await handleNewGenres(req.body.newGenres);
        genres = [...new Set([...genres, ...newGenres])];

        // Upload files
        const audioFile = req.files.audio[0];
        const { fileUrl: audioUrl, duration } = await uploadAudioFile(audioFile);

        // Handle image upload
        let imageUrl = "";
        if (req.body.useAlbumImage === 'true' && req.body.albumId) {
            const albumData = await albumModel.findById(req.body.albumId);
            if (albumData?.image) {
                imageUrl = albumData.image;
            } else {
                return res.json({success: false, message: "Album image not found"});
            }
        } else if (req.files.image?.[0]) {
            imageUrl = await uploadImageFile(req.files.image[0]);
        } else {
            return res.json({success: false, message: "Image is required"});
        }

        // Handle LRC file upload
        const lrcFileUrl = req.files.lrc?.[0] ? await uploadLrcFile(req.files.lrc[0]) : "";

        // Get artist names
        const { artistName } = await getArtistNames(artistIds);

        const songData = {
            name,
            artist: artistIds,
            artistName,
            album,
            image: imageUrl,
            file: audioUrl,
            duration,
            lrcFile: lrcFileUrl,
            genres,
            fingerprints: []
        };

        // Handle YouTube URL and fingerprinting
        if (req.body.youtubeUrl && ytdl.validateURL(req.body.youtubeUrl)) {
            const videoId = ytdl.getURLVideoID(req.body.youtubeUrl);
            songData.youtubeId = videoId;
            songData.youtubeUrl = req.body.youtubeUrl;

            if (req.body.generateFingerprint === 'true') {
                try {
                    const audioData = await fs.readFile(audioFile.path);
                    const audioDecode = (await import('audio-decode')).default;
                    const decodedAudio = await audioDecode(audioData);
                    const samples = decodedAudio.getChannelData(0);
                    songData.fingerprints = generateFingerprint(samples);
                } catch (error) {
                    console.error("Error generating fingerprints:", error);
                }
            }
        }

        await executeTransaction(async (session) => {
            const song = new songModel(songData);
            const savedSong = await song.save({ session });

            if (genres.length > 0) {
                // Update genres
                await Promise.all(genres.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $addToSet: { songList: savedSong._id },
                            $inc: { songCount: 1 }
                        },
                        { session, new: true }
                    )
                ));

                // Update artists' genres
                if (artistIds.length > 0) {
                    await Promise.all(artistIds.map(async artistId => {
                        const artist = await artistModel.findById(artistId).session(session);
                        if (artist) {
                            const uniqueGenres = new Set([
                                ...(artist.genres || []).map(g => g.toString()),
                                ...genres
                            ]);
                            await artistModel.findByIdAndUpdate(
                                artistId,
                                { genres: Array.from(uniqueGenres) },
                                { session, new: true }
                            );
                        }
                    }));
                }
            }
        });

        res.json({success: true, message: "Song Added"});
    } catch (error) {
        console.error("Error in addSong:", error);
        res.json({success: false, message: error.message});
    }
};

const listSong = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { album: { $regex: search, $options: 'i' } },
                    { artistName: { $regex: search, $options: 'i' } }
                ]
            };
        }

        const allSongs = await songModel.find(query);
        res.json({success: true, songs: allSongs});
    } catch (error) {
        console.error("Error listing songs:", error);
        res.json({success: false, message: error.message});
    }
};

const removeSong = async (req, res) => {
    try {
        const songId = req.body.id;
        const song = await songModel.findById(songId);
        if (!song) {
            return res.json({success: false, message: "Song not found"});
        }

        const genreIds = song.genres.map(g => g.toString());
        const artistIds = Array.isArray(song.artist) ? song.artist.map(a => a.toString()) : [];

        await executeTransaction(async (session) => {
            await songModel.findByIdAndDelete(songId).session(session);

            if (genreIds.length > 0) {
                await Promise.all(genreIds.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $pull: { songList: songId },
                            $inc: { songCount: -1 }
                        },
                        { session, new: true }
                    )
                ));
            }

            if (artistIds.length > 0 && genreIds.length > 0) {
                for (const artistId of artistIds) {
                    const artistSongs = await songModel.find({
                        artist: artistId,
                        _id: { $ne: songId }
                    }).session(session);

                    const remainingGenres = new Set();
                    artistSongs.forEach(song => {
                        if (song.genres?.length > 0) {
                            song.genres.forEach(genreId => {
                                remainingGenres.add(genreId.toString());
                            });
                        }
                    });

                    await artistModel.findByIdAndUpdate(
                        artistId,
                        { genres: Array.from(remainingGenres) },
                        { session, new: true }
                    );
                }
            }
        });

        res.json({success: true, message: "Song removed"});
    } catch (error) {
        console.error("Error in removeSong:", error);
        res.json({success: false, message: error.message});
    }
};

const updateSong = async (req, res) => {
    try {
        const { id } = req.body;
        const name = req.body.name;
        const artistIds = convertToArray(req.body.artists) || convertToArray(req.body.artist);
        const album = req.body.album;

        // Process genres
        let genres = convertToArray(req.body.genres);
        const newGenres = await handleNewGenres(req.body.newGenres);
        genres = [...new Set([...genres, ...newGenres])];

        // Get artist names
        const { artistName } = await getArtistNames(artistIds);

        const updateData = {
            name,
            artist: artistIds,
            artistName,
            album,
            genres
        };

        // Handle YouTube URL if provided
        if (req.body.youtubeUrl && ytdl.validateURL(req.body.youtubeUrl)) {
            const videoId = ytdl.getURLVideoID(req.body.youtubeUrl);
            updateData.youtubeId = videoId;
            updateData.youtubeUrl = req.body.youtubeUrl;
        }

        // Handle file updates
        if (req.body.useAlbumImage === 'true' && req.body.albumId) {
            const albumData = await albumModel.findById(req.body.albumId);
            if (albumData?.image) {
                updateData.image = albumData.image;
            } else {
                return res.json({success: false, message: "Album image not found"});
            }
        } else if (req.files) {
            if (req.files.image?.[0]) {
                updateData.image = await uploadImageFile(req.files.image[0]);
            }
            if (req.files.audio?.[0]) {
                const { fileUrl, duration } = await uploadAudioFile(req.files.audio[0]);
                updateData.file = fileUrl;
                updateData.duration = duration;
            }
            if (req.files.lrc?.[0]) {
                updateData.lrcFile = await uploadLrcFile(req.files.lrc[0]);
            }
        }

        const currentSong = await songModel.findById(id);
        if (!currentSong) {
            return res.json({success: false, message: "Song not found"});
        }

        const oldGenres = currentSong.genres.map(g => g.toString());
        const oldArtistIds = Array.isArray(currentSong.artist) ? currentSong.artist.map(a => a.toString()) : [];

        await executeTransaction(async (session) => {
            await songModel.findByIdAndUpdate(id, updateData, { session });

            // Handle genre updates
            const removedGenres = oldGenres.filter(g => !genres.includes(g));
            const addedGenres = genres.filter(g => !oldGenres.includes(g));

            if (removedGenres.length > 0) {
                await Promise.all(removedGenres.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $pull: { songList: id },
                            $inc: { songCount: -1 }
                        },
                        { session, new: true }
                    )
                ));
            }

            if (addedGenres.length > 0) {
                await Promise.all(addedGenres.map(genreId =>
                    genreModel.findByIdAndUpdate(
                        genreId,
                        {
                            $addToSet: { songList: id },
                            $inc: { songCount: 1 }
                        },
                        { session, new: true }
                    )
                ));
            }

            // Handle artist updates
            const removedArtists = oldArtistIds.filter(a => !artistIds.includes(a));
            const addedArtists = artistIds.filter(a => !oldArtistIds.includes(a));

            for (const artistId of removedArtists) {
                const artistSongs = await songModel.find({
                    artist: artistId,
                    _id: { $ne: id }
                }).session(session);

                const remainingGenres = new Set();
                artistSongs.forEach(song => {
                    if (song.genres?.length > 0) {
                        song.genres.forEach(genreId => {
                            remainingGenres.add(genreId.toString());
                        });
                    }
                });

                await artistModel.findByIdAndUpdate(
                    artistId,
                    { genres: Array.from(remainingGenres) },
                    { session, new: true }
                );
            }

            for (const artistId of addedArtists) {
                const artist = await artistModel.findById(artistId).session(session);
                if (artist) {
                    const uniqueGenres = new Set([
                        ...(artist.genres || []).map(g => g.toString()),
                        ...genres
                    ]);

                    await artistModel.findByIdAndUpdate(
                        artistId,
                        { genres: Array.from(uniqueGenres) },
                        { session, new: true }
                    );
                }
            }
        });

        res.json({success: true, message: "Song updated"});
    } catch (error) {
        console.error("Error updating song:", error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

// Keeping existing functions unchanged as they are related to audio processing and fingerprinting
const uploadSong = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No audio file provided' });
        }

        const audioData = await fs.readFile(req.file.path);
        const audioDecode = (await import('audio-decode')).default;
        const decodedAudio = await audioDecode(audioData);
        const samples = decodedAudio.numberOfChannels > 1 ? decodedAudio.getChannelData(0) : decodedAudio.getChannelData(0);
        const fingerprints = generateFingerprint(samples);

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

        await fs.unlink(req.file.path);

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

const findMatches = async (req, res) => {
    console.log("findMatches called");
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No audio sample provided' });
        }

        console.log("File received:", req.file.originalname, req.file.mimetype, req.file.size);
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Audio processing timed out')), 30000)
        );
        
        const processAudio = async () => {
            try {
                console.log("Reading file...");
                const audioData = await fs.readFile(req.file.path);
                console.log("File read successfully, size:", audioData.length);
                
                const fileExtension = req.file.originalname.split('.').pop().toLowerCase();
                console.log("File extension:", fileExtension);
                console.log("MIME type:", req.file.mimetype);
                
                if (req.file.mimetype.includes('webm')) {
                    try {
                        console.log("Detected WebM format from browser recording");
                        
                        const inputPath = req.file.path;
                        const outputPath = `${req.file.path}.wav`;
                        
                        console.log(`Converting WebM to WAV: ${inputPath} -> ${outputPath}`);
                        
                        await new Promise((resolve, reject) => {
                            ffmpeg(inputPath)
                                .outputOptions('-ac 1')
                                .outputOptions('-ar 44100')
                                .save(outputPath)
                                .on('end', resolve)
                                .on('error', reject);
                        });
                        
                        console.log("Reading converted WAV file...");
                        const wavData = await fs.readFile(outputPath);
                        
                        console.log("Decoding WAV file...");
                        const nodeWav = await import('node-wav');
                        const wavDecoded = nodeWav.default.decode(wavData);
                        
                        console.log("Processing audio data...");
                        const samples = wavDecoded.channelData[0];
                        
                        console.log("Generating fingerprints...");
                        const fingerprints = generateFingerprint(samples);
                        console.log(`Generated ${fingerprints.length} fingerprints`);
                        
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
                            if (!song.fingerprints?.length) continue;
                            
                            console.log(`Comparing with song: ${song.name}`);
                            const result = matchFingerprints(fingerprints, song.fingerprints);
                            
                            if (result.length > 0 && result[0].confidence >= 0.1) {
                                matches.push({
                                    songId: song._id,
                                    name: song.name,
                                    artist: song.artistName,
                                    album: song.album,
                                    image: song.image,
                                    confidence: Math.round(result[0].confidence * 100)
                                });
                            }
                        }
                        
                        try {
                            await fs.unlink(outputPath);
                            console.log("Temporary WAV file cleaned up");
                        } catch (cleanupError) {
                            console.error("Error cleaning up temporary WAV file:", cleanupError);
                        }
                        
                        console.log(`Found ${matches.length} potential matches`);
                        const sortedMatches = matches.sort((a, b) => b.confidence - a.confidence);
                        const highConfidenceMatches = sortedMatches.filter(match => match.confidence >= 75);
                        
                        return res.json({ 
                            success: true, 
                            matches: highConfidenceMatches.length > 0
                                ? highConfidenceMatches.slice(0, 3)
                                : sortedMatches.slice(0, 3)
                        });
                    } catch (webmError) {
                        console.error("Error processing WebM:", webmError);
                    }
                }
                
                if (fileExtension === 'wav' || req.file.mimetype.includes('wav')) {
                    try {
                        console.log("Attempting to decode with node-wav...");
                        const nodeWav = await import('node-wav');
                        const wavData = nodeWav.default.decode(audioData);
                        console.log("WAV decode successful!");
                        
                        const samples = wavData.channelData[0];
                        const fingerprints = generateFingerprint(samples);
                        
                        const songs = await songModel.find({ fingerprints: { $exists: true, $ne: [] } });
                        
                        if (songs.length === 0) {
                            return res.json({ 
                                success: false, 
                                message: 'No songs with fingerprints found in the database.'
                            });
                        }
                        
                        const matches = [];
                        for (const song of songs) {
                            if (!song.fingerprints?.length) continue;
                            
                            const result = matchFingerprints(fingerprints, song.fingerprints);
                            if (result.length > 0 && result[0].confidence >= 0.1 && result[0].confidence <= 0.99) {
                                matches.push({
                                    songId: song._id,
                                    name: song.name,
                                    artist: song.artistName,
                                    album: song.album,
                                    image: song.image,
                                    confidence: Math.round(result[0].confidence * 100)
                                });
                            }
                        }
                        
                        return res.json({ 
                            success: true, 
                            matches: matches.sort((a, b) => b.confidence - a.confidence) 
                        });
                    } catch (wavError) {
                        console.error("Error decoding with node-wav:", wavError);
                    }
                }
                
                try {
                    console.log("Attempting direct decode with audio-decode...");
                    const audioDecode = (await import('audio-decode')).default;
                    const decodedAudio = await audioDecode(audioData);
                    console.log("Direct decode successful!");
                    
                    const samples = decodedAudio.getChannelData(0);
                    const fingerprints = generateFingerprint(samples);
                    
                    const songs = await songModel.find({ fingerprints: { $exists: true, $ne: [] } });
                    
                    if (songs.length === 0) {
                        return res.json({ 
                            success: false, 
                            message: 'No songs with fingerprints found in the database.'
                        });
                    }
                    
                    const matches = [];
                    for (const song of songs) {
                        if (!song.fingerprints?.length) continue;
                        
                        const result = matchFingerprints(fingerprints, song.fingerprints);
                        if (result.length > 0 && result[0].confidence >= 0.1 && result[0].confidence <= 0.99) {
                            matches.push({
                                songId: song._id,
                                name: song.name,
                                artist: song.artistName,
                                album: song.album,
                                image: song.image,
                                confidence: Math.round(result[0].confidence * 100)
                            });
                        }
                    }
                    
                    return res.json({ 
                        success: true, 
                        matches: matches.sort((a, b) => b.confidence - a.confidence) 
                    });
                    
                } catch (decodeError) {
                    console.error("Error decoding audio:", decodeError);
                    
                    const songs = await songModel.find({ fingerprints: { $exists: true, $ne: [] } }).limit(5);
                    const fallbackMatches = songs.map(song => ({
                        songId: song._id,
                        name: song.name,
                        artist: song.artistName,
                        album: song.album,
                        image: song.image,
                        score: 0.1
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
        
        await Promise.race([processAudio(), timeoutPromise]);
        
    } catch (error) {
        console.error("Error finding matches:", error);
        return res.json({ 
            success: false, 
            message: error.message || 'Server error processing audio' 
        });
    } finally {
        if (req.file?.path) {
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

        if (!youtubeUrl.includes('youtube.com') && !youtubeUrl.includes('youtu.be')) {
            return res.status(400).json({ 
                success: false,
                message: 'Invalid YouTube URL format' 
            });
        }

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

        return res.status(200).json({
            success: true,
            videoId: videoId,
            title: "Sample Title",
            artist: "Sample Artist",
            thumbnailUrl: `https://img.youtube.com/vi/${videoId}/0.jpg`,
            duration: "180"
        });
    } catch (error) {
        console.error('YouTube download error:', error);
        return res.status(500).json({ 
            success: false,
            message: 'Error processing YouTube URL',
            error: error.message || 'Unknown error'
        });
    }
};

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
        
        if (response.data.items?.[0]) {
            return response.data.items[0].id.videoId;
        }
        return null;
    } catch (error) {
        console.error('YouTube API error:', error);
        return null;
    }
};

export {
    addSong, 
    listSong, 
    removeSong, 
    updateSong, 
    uploadSong, 
    findMatches, 
    downloadSong
}
