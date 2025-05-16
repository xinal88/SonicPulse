import mongoose from "mongoose";

const artistSchema = new mongoose.Schema({
    name: {type: String, required: true},
    bgColor: {type: String, required: true},
    image: {type: String, required: true},
    genres: [{type: mongoose.Schema.Types.ObjectId, ref: 'genre'}] // Array of genre IDs, automatically populated
})

const artistModel = mongoose.models.artist || mongoose.model("artist", artistSchema);

export default artistModel;
