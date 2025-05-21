import mongoose from "mongoose";

const genreSchema = new mongoose.Schema({
    name: {type: String, required: true, unique: true},
    songList: [{type: mongoose.Schema.Types.ObjectId, ref: 'song'}], // Array of song IDs
    songCount: {type: Number, default: 0}, // Count of songs in this genre
});

const genreModel = mongoose.models.genre || mongoose.model("genre", genreSchema);

export default genreModel;
