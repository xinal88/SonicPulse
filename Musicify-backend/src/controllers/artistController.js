import {v2 as cloudinary} from 'cloudinary'
import artistModel from '../models/artistModel.js'
import songModel from '../models/songModel.js'

/**
 * Normalizes an artist name by converting to lowercase and trimming spaces at the beginning and end
 * while preserving spaces between words
 * @param {string} name - The artist name to normalize
 * @returns {string} - The normalized artist name
 */
const normalizeArtistName = (name) => {
    if (!name) return '';
    return name.toLowerCase().trim();
};

const addArtist = async (req, res) => {
    try {
        const rawName = req.body.name;

        if (!rawName) {
            return res.json({
                success: false,
                message: "Artist name is required"
            });
        }

        const bgColor = req.body.bgColor;

        // Normalize the artist name
        const normalizedName = normalizeArtistName(rawName);

        // Check if an artist with this normalized name already exists
        const existingArtist = await artistModel.find({});
        const isDuplicate = existingArtist.some(artist =>
            normalizeArtistName(artist.name) === normalizedName
        );

        if (isDuplicate) {
            return res.json({
                success: false,
                message: "An artist with this name already exists",
                isDuplicate: true
            });
        }

        // If no image file is provided
        if (!req.file) {
            return res.json({
                success: false,
                message: "Artist image is required"
            });
        }

        const imageFile = req.file;
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});

        // Use the original name format for display, but we've verified it's unique when normalized
        const artistData = {
            name: rawName,
            bgColor,
            image: imageUpload.secure_url
        }

        const artist = artistModel(artistData);
        await artist.save();

        res.json({success: true, message: "Artist added successfully"})

    } catch (error) {
        console.error("Error adding artist:", error);
        res.json({success: false, message: "An error occurred while adding the artist"})
    }
}

const listArtist = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        // If search parameter is provided, filter by name
        if (search) {
            query.name = { $regex: search, $options: 'i' }; // Case-insensitive search
        }

        const allArtists = await artistModel.find(query);
        res.json({success: true, artists: allArtists});
    } catch (error) {
        console.error("Error listing artists:", error);
        res.json({success: false});
    }
}

const removeArtist = async (req, res) => {
    try {
        const artistId = req.body.id;

        console.log(`Checking for songs with artist ID: ${artistId}`);

        // Get all songs
        const allSongs = await songModel.find();
        console.log(`Total songs in database: ${allSongs.length}`);

        // Filter songs that have this artist in their artist array
        const songsWithArtist = allSongs.filter(song => {
            // Make sure artist is an array and contains valid elements
            if (!song.artist || !Array.isArray(song.artist)) {
                return false;
            }

            // Check if any artist ID in the array matches our artist ID
            return song.artist.some(id => {
                // Convert to string for comparison if needed
                const artistIdStr = id.toString();
                const targetIdStr = artistId.toString();
                const matches = artistIdStr === targetIdStr;

                if (matches) {
                    console.log(`Found match: Song ID ${song._id}, Song name: ${song.name}`);
                }

                return matches;
            });
        });

        console.log(`Found ${songsWithArtist.length} songs with this artist`);

        if (songsWithArtist.length > 0) {
            // Artist has songs, cannot delete
            return res.json({
                success: false,
                message: "Cannot delete artist because there are songs associated with them. Please delete those songs first.",
                hasSongs: true,
                songCount: songsWithArtist.length
            });
        }

        // No songs found, proceed with deletion
        await artistModel.findByIdAndDelete(artistId);
        res.json({success: true, message: "Artist deleted successfully"});
    } catch (error) {
        console.error("Error removing artist:", error);
        res.json({success: false, message: "An error occurred while deleting the artist"});
    }
}

const updateArtist = async (req, res) => {
    try {
        const { id } = req.body;
        const rawName = req.body.name;
        const bgColor = req.body.bgColor;

        if (!rawName) {
            return res.json({
                success: false,
                message: "Artist name is required"
            });
        }

        // Normalize the artist name
        const normalizedName = normalizeArtistName(rawName);

        // Get the current artist to check if name is actually changing
        const currentArtist = await artistModel.findById(id);
        if (!currentArtist) {
            return res.json({
                success: false,
                message: "Artist not found"
            });
        }

        // Only check for duplicates if the name is actually changing
        if (normalizeArtistName(currentArtist.name) !== normalizedName) {
            // Check if another artist with this normalized name already exists
            const existingArtists = await artistModel.find({ _id: { $ne: id } });
            const isDuplicate = existingArtists.some(artist =>
                normalizeArtistName(artist.name) === normalizedName
            );

            if (isDuplicate) {
                return res.json({
                    success: false,
                    message: "An artist with this name already exists",
                    isDuplicate: true
                });
            }
        }

        // Create update data object
        const updateData = {
            name: rawName,
            bgColor
        };

        // If a new image is uploaded, process it
        if (req.file) {
            const imageFile = req.file;
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});
            updateData.image = imageUpload.secure_url;
        }

        // Update the artist in the database
        await artistModel.findByIdAndUpdate(id, updateData);

        res.json({success: true, message: "Artist updated successfully"});
    } catch (error) {
        console.error("Error updating artist:", error);
        res.json({success: false, message: "An error occurred while updating the artist"});
    }
}

export {addArtist, listArtist, removeArtist, updateArtist};
