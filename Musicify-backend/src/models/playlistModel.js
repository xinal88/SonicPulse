import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema({
    name: {type: String, required: true},
    description: {type: String, default: ""},
    image: {type: String, required: true},
    creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true},
    songs: [{type: mongoose.Schema.Types.ObjectId, ref: 'song'}], // Array of song IDs
    songCount: {type: Number, default: 0}, // Count of songs in this playlist
    isPublic: {type: Boolean, default: true}, // Whether the playlist is public or private
    createdAt: {type: Date, default: Date.now},
    updatedAt: {type: Date, default: Date.now}
});

// Update the updatedAt timestamp before saving
playlistSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    next();
});

const playlistModel = mongoose.models.playlist || mongoose.model("playlist", playlistSchema);

export default playlistModel;
