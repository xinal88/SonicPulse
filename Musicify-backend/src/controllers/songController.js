import {v2 as cloudinary} from 'cloudinary'
import songModel from '../models/songModel.js';
import artistModel from '../models/artistModel.js';
import albumModel from '../models/albumModel.js';
import genreModel from '../models/genreModel.js';

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
                // Check if genre already exists
                const existingGenre = await genreModel.findOne({
                    name: { $regex: new RegExp(`^${genreName}$`, 'i') }
                });

                if (existingGenre) {
                    // If it exists, add its ID to the genres array if not already there
                    if (!genres.includes(existingGenre._id.toString())) {
                        genres.push(existingGenre._id.toString());
                    }
                } else {
                    // Create new genre
                    const newGenre = new genreModel({ name: genreName });
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

        const song = songModel(songData);
        await song.save();

        // Update genres for all artists
        if (genres.length > 0 && artistIds.length > 0) {
            try {
                // Update each artist's genres
                for (const artistId of artistIds) {
                    const artist = await artistModel.findById(artistId);
                    if (artist) {
                        // Create a set of unique genre IDs
                        const uniqueGenres = new Set([
                            ...(artist.genres || []).map(g => g.toString()),
                            ...genres
                        ]);

                        // Update artist with unique genres
                        await artistModel.findByIdAndUpdate(
                            artistId,
                            { genres: Array.from(uniqueGenres) }
                        );
                    }
                }
            } catch (error) {
                console.error("Error updating artist genres:", error);
                // Continue even if updating artist genres fails
            }
        }

        res.json({success:true, message:"Song Added"})
    } catch (error) {
        console.error("Error in addSong: ", error);
        res.json({success:false})
    }
}

const listSong = async (req, res) => {
    try {
        // Find all songs and populate the genres field
        const allSongs = await songModel.find({});

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
        console.log(req.body.id)
        await songModel.findByIdAndDelete(req.body.id);
        res.json({success:true, message:"Song removed"});
    } catch (error) {
        console.log(error)
        res.json({success:false});
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
                // Check if genre already exists
                const existingGenre = await genreModel.findOne({
                    name: { $regex: new RegExp(`^${genreName}$`, 'i') }
                });

                if (existingGenre) {
                    // If it exists, add its ID to the genres array if not already there
                    if (!genres.includes(existingGenre._id.toString())) {
                        genres.push(existingGenre._id.toString());
                    }
                } else {
                    // Create new genre
                    const newGenre = new genreModel({ name: genreName });
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

        // Update the song in the database
        await songModel.findByIdAndUpdate(id, updateData);

        // Update genres for all artists if genres were provided
        if (genres.length > 0 && artistIds.length > 0) {
            try {
                // Update each artist's genres
                for (const artistId of artistIds) {
                    const artist = await artistModel.findById(artistId);
                    if (artist) {
                        // Create a set of unique genre IDs
                        const uniqueGenres = new Set([
                            ...(artist.genres || []).map(g => g.toString()),
                            ...genres
                        ]);

                        // Update artist with unique genres
                        await artistModel.findByIdAndUpdate(
                            artistId,
                            { genres: Array.from(uniqueGenres) }
                        );
                    }
                }
            } catch (error) {
                console.error("Error updating artist genres:", error);
                // Continue even if updating artist genres fails
            }
        }

        res.json({success: true, message: "Song updated"});
    } catch (error) {
        console.error("Error updating song:", error);
        res.json({success: false});
    }
}

export {addSong, listSong, removeSong, updateSong}