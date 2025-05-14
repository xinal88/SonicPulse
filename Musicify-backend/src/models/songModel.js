import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
    name: {type: String, required: true},
    artist: {type: String, required: true}, // Changed from desc to artist
    album: {type: String, required: true},
    image: { type: String, required: true},
    file: {type: String, required: true},
    duration: {type: String, required: true},
    lrcFile: {type: String, default: ""} // URL to the LRC file
})

const songModel = mongoose.models.song || mongoose.model("song", songSchema);

export default songModel;