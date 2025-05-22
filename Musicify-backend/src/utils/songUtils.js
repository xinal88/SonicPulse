import genreModel from '../models/genreModel.js';
import { normalizeGenreName } from '../controllers/genreController.js';
import artistModel from '../models/artistModel.js';

export const convertToArray = (value) => {
    if (!value) return [];
    if (typeof value === 'string') return [value];
    if (Array.isArray(value)) return value;
    return [];
};

export const handleNewGenres = async (newGenres) => {
    const genres = [];
    if (!newGenres) return genres;

    const newGenreNames = Array.isArray(newGenres) ? newGenres : [newGenres];
    
    for (const genreName of newGenreNames) {
        if (!genreName || genreName.trim() === '') continue;
        
        const normalizedName = normalizeGenreName(genreName);
        if (normalizedName === '') continue;

        const existingGenre = await genreModel.findOne({
            name: { $regex: new RegExp(`^${normalizedName}$`, 'i') }
        });

        if (existingGenre) {
            if (!genres.includes(existingGenre._id.toString())) {
                genres.push(existingGenre._id.toString());
            }
        } else {
            const newGenre = new genreModel({ name: genreName.trim() });
            await newGenre.save();
            genres.push(newGenre._id.toString());
        }
    }
    return genres;
};

export const getArtistNames = async (artistIds) => {
    try {
        const artistDocs = await artistModel.find({ _id: { $in: artistIds } });
        const artistNames = artistDocs.map(doc => doc.name);
        return {
            artistNames,
            artistName: artistNames.join(", ")
        };
    } catch (error) {
        console.error("Error finding artists:", error);
        return {
            artistNames: [],
            artistName: ""
        };
    }
};