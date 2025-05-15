import genreModel from '../models/genreModel.js';

const addGenre = async (req, res) => {
    try {
        const { name } = req.body;
        
        // Check if genre already exists
        const existingGenre = await genreModel.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingGenre) {
            return res.json({ success: false, message: "Genre already exists" });
        }
        
        const genreData = { name };
        const genre = genreModel(genreData);
        await genre.save();
        
        res.json({ success: true, message: "Genre added", genre });
    } catch (error) {
        console.error("Error adding genre:", error);
        res.json({ success: false, message: "Error adding genre" });
    }
};

const listGenre = async (req, res) => {
    try {
        const genres = await genreModel.find().sort({ name: 1 });
        res.json({ success: true, genres });
    } catch (error) {
        console.error("Error listing genres:", error);
        res.json({ success: false });
    }
};

const removeGenre = async (req, res) => {
    try {
        const { id } = req.body;
        await genreModel.findByIdAndDelete(id);
        res.json({ success: true, message: "Genre removed" });
    } catch (error) {
        console.error("Error removing genre:", error);
        res.json({ success: false });
    }
};

export { addGenre, listGenre, removeGenre };
