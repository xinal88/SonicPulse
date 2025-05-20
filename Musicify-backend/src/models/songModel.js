import mongoose from "mongoose";

const songSchema = new mongoose.Schema({
    name: {type: String, required: true},
    artist: [{type: mongoose.Schema.Types.ObjectId, ref: 'artist'}], // Array of artist IDs
    artistName: {type: String, default: ""}, // Store concatenated artist names for display purposes
    album: {type: String, required: true},
    image: { type: String, required: true},
    file: {type: String, required: true},
    duration: {type: String, required: true},
    lrcFile: {type: String, default: ""}, // URL to the LRC file
    genres: [{type: mongoose.Schema.Types.ObjectId, ref: 'genre'}], // Array of genre IDs
    youtubeId: {type: String, default: ""}, // YouTube video ID for the song
    fingerprints: [{ // Audio fingerprints for song recognition
        timeOffset: {type: Number},
        frequencies: [{type: Number}],
        amplitudes: [{type: Number}]
    }]
});

const songModel = mongoose.models.song || mongoose.model("song", songSchema);

export default songModel;
