import mongoose from "mongoose";

const genreSchema = new mongoose.Schema({
    name: {type: String, required: true, unique: true},
});

const genreModel = mongoose.models.genre || mongoose.model("genre", genreSchema);

export default genreModel;
