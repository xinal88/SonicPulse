import {v2 as cloudinary} from 'cloudinary'
import artistModel from '../models/artistModel.js'

const addArtist = async (req, res) => {
    try {
        const name = req.body.name;
        const bgColor = req.body.bgColor;
        const imageFile = req.file;
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});
        const artistData = {
            name,
            bgColor,
            image: imageUpload.secure_url
        }

        const artist = artistModel(artistData);
        await artist.save();

        res.json({success: true, message: "Artist added"})

    } catch (error) {
        console.error("Error adding artist:", error);
        res.json({success: false})
    }
}

const listArtist = async (req, res) => {
    try {
        const allArtists = await artistModel.find({});
        res.json({success: true, artists: allArtists});
    } catch (error) {
        console.error("Error listing artists:", error);
        res.json({success: false});
    }
}

const removeArtist = async (req, res) => {
    try {
        await artistModel.findByIdAndDelete(req.body.id);
        res.json({success: true, message: "Artist deleted"});
    } catch (error) {
        console.error("Error removing artist:", error);
        res.json({success: false});
    }
}

const updateArtist = async (req, res) => {
    try {
        const { id } = req.body;
        const name = req.body.name;
        const bgColor = req.body.bgColor;
        
        // Create update data object
        const updateData = {
            name,
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
        
        res.json({success: true, message: "Artist updated"});
    } catch (error) {
        console.error("Error updating artist:", error);
        res.json({success: false});
    }
}

export {addArtist, listArtist, removeArtist, updateArtist};
