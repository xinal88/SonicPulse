import {v2 as cloudinary} from 'cloudinary'
import albumModel from '../models/albumModel.js'
import songModel from '../models/songModel.js'

const addAlbum = async (req, res) => {
    try {

        const name = req.body.name;
        const desc = req.body.desc;
        const bgColor = req.body.bgColor;
        const imageFile = req.file;
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});
        const albumData = {
            name,
            desc,
            bgColor,
            image: imageUpload.secure_url
        }

        const album = albumModel(albumData);
        await album.save();

        res.json({success: true, message: "Album added"})

    } catch (error) {
        res.json({success: false})
    }
}

const listAlbum = async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        // If search parameter is provided, search by album name or description
        if (search) {
            query = {
                $or: [
                    { name: { $regex: search, $options: 'i' } },    // Search by album name
                    { desc: { $regex: search, $options: 'i' } }     // Search by album description
                ]
            };
        }

        const allAlbums = await albumModel.find(query);
        res.json({success: true, albums: allAlbums});
    } catch (error) {
        console.error("Error listing albums:", error);
        res.json({success: false});
    }
}

const removeAlbum = async (req, res) => {
    try {
        const albumId = req.body.id;
        const albumName = req.body.albumName; // Optional, for better logging
        const confirmed = req.body.confirmed;

        console.log(`Album deletion request - ID: ${albumId}, Name: ${albumName}, Confirmed: ${confirmed}`);

        // Get the album data first to ensure we have the correct name
        const albumData = await albumModel.findById(albumId);
        if (!albumData) {
            console.log(`Album not found with ID: ${albumId}`);
            return res.json({success: false, message: "Album not found"});
        }

        const albumNameToUse = albumData.name;
        console.log(`Found album: ${albumNameToUse}`);

        // If not confirmed, just return the count of songs that would be deleted
        if (!confirmed) {
            // Find songs associated with this album
            const songsInAlbum = await songModel.find({ album: albumNameToUse });
            console.log(`Found ${songsInAlbum.length} songs in album "${albumNameToUse}"`);

            return res.json({
                success: true,
                requiresConfirmation: true,
                songCount: songsInAlbum.length,
                message: `This will delete the album and ${songsInAlbum.length} song(s) associated with it.`
            });
        }

        // User confirmed deletion, proceed with deleting songs and album
        console.log(`Deleting songs in album "${albumNameToUse}"`);

        // Delete all songs in this album
        const deleteResult = await songModel.deleteMany({ album: albumNameToUse });
        console.log(`Deleted ${deleteResult.deletedCount} songs from album "${albumNameToUse}"`);

        // Delete the album
        await albumModel.findByIdAndDelete(albumId);
        console.log(`Deleted album "${albumNameToUse}"`);

        res.json({
            success: true,
            message: `Album deleted along with ${deleteResult.deletedCount} song(s)`,
            deletedSongs: deleteResult.deletedCount
        });
    } catch (error) {
        console.error("Error removing album:", error);
        res.json({success: false, message: "An error occurred while deleting the album"});
    }
}

const updateAlbum = async (req, res) => {
    try {
        const { id } = req.body;
        const name = req.body.name;
        const desc = req.body.desc;
        const bgColor = req.body.bgColor;

        // Create update data object
        const updateData = {
            name,
            desc,
            bgColor
        };

        // If a new image is uploaded, process it
        if (req.file) {
            const imageFile = req.file;
            const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});
            updateData.image = imageUpload.secure_url;
        }

        // Update the album in the database
        await albumModel.findByIdAndUpdate(id, updateData);

        res.json({success: true, message: "Album updated"});
    } catch (error) {
        console.error("Error updating album:", error);
        res.json({success: false});
    }
}

export {addAlbum, listAlbum, removeAlbum, updateAlbum};