import {v2 as cloudinary} from 'cloudinary'
import songModel from '../models/songModel.js';

const addSong = async (req, res) => {
    try {
        const name = req.body.name;
        const artist = req.body.artist; // Changed from desc to artist
        const album = req.body.album;
        const audioFile = req.files.audio[0];
        const imageFile = req.files.image[0];

        // Upload audio and image to cloudinary
        const audioUpload = await cloudinary.uploader.upload(audioFile.path, {resource_type:"video"});
        const imageUpload = await cloudinary.uploader.upload(imageFile.path, {resource_type:"image"});
        const duration = `${Math.floor(audioUpload.duration/60)}:${Math.floor(audioUpload.duration%60)}`;

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

        console.log(name, artist, album, audioUpload, imageUpload);

        const songData = {
            name,
            artist, // Changed from desc to artist
            album,
            image: imageUpload.secure_url,
            file: audioUpload.secure_url,
            duration,
            lrcFile: lrcFileUrl
        }

        const song = songModel(songData);
        await song.save();

        res.json({success:true, message:"Song Added"})
    } catch (error) {
        console.error("Error in addSong: ", error);
        res.json({success:false})
    }
}

const listSong = async (req, res) => {
    try {
        const allSongs = await songModel.find({});
        res.json({success:true, songs: allSongs});
    } catch (error) {
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

export {addSong, listSong, removeSong}