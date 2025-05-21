import genreModel from '../models/genreModel.js';
import mongoose from 'mongoose';

/**
 * Normalizes a genre name by converting to lowercase and removing all non-alphabetic characters
 * @param {string} name - The genre name to normalize
 * @returns {string} - The normalized genre name
 */
export const normalizeGenreName = (name) => {
    if (!name) return '';
    // Convert to lowercase and remove all non-alphabetic characters (except spaces)
    return name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
};

const addGenre = async (req, res) => {
    try {
        const { name } = req.body;

        if (!name || name.trim() === '') {
            return res.json({
                success: false,
                message: "Genre name is required"
            });
        }

        // Normalize the genre name for comparison
        const normalizedName = normalizeGenreName(name);

        if (normalizedName === '') {
            return res.json({
                success: false,
                message: "Genre name must contain at least one alphanumeric character"
            });
        }

        // Get all genres and check if any normalized name matches
        const allGenres = await genreModel.find();
        const isDuplicate = allGenres.some(genre =>
            normalizeGenreName(genre.name) === normalizedName
        );

        if (isDuplicate) {
            return res.json({
                success: false,
                message: "A genre with this name already exists",
                isDuplicate: true
            });
        }

        // Use the original name format for display, but we've verified it's unique when normalized
        const genreData = { name: name.trim() };
        const genre = genreModel(genreData);
        await genre.save();

        res.json({ success: true, message: "Genre added successfully", genre });
    } catch (error) {
        console.error("Error adding genre:", error);
        res.json({ success: false, message: "An error occurred while adding the genre" });
    }
};

const listGenre = async (req, res) => {
    try {
        // Check query parameters
        const { includeSongs, includeCounts, id } = req.query;

        // Build the query
        let queryFilter = {};

        // If ID is provided, filter by that ID
        if (id) {
            queryFilter = { _id: id };
        }

        let query = genreModel.find(queryFilter).sort({ name: 1 });

        // If includeSongs is true, populate the songList field
        if (includeSongs === 'true') {
            query = query.populate('songList');
        }

        const genres = await query;

        // If includeCounts is true and songCount is not already populated, calculate song counts
        if (includeCounts === 'true') {
            // Check if we need to calculate counts (if they're not already in the database)
            const needToCalculateCounts = genres.some(genre => typeof genre.songCount === 'undefined');

            if (needToCalculateCounts) {
                const songModel = mongoose.model('song');

                // Get all songs with genres
                const songs = await songModel.find({ genres: { $exists: true, $ne: [] } });

                // Create a map to count songs per genre
                const genreCounts = {};

                // Count songs for each genre
                songs.forEach(song => {
                    if (song.genres && song.genres.length > 0) {
                        song.genres.forEach(genreId => {
                            const genreIdStr = genreId.toString();
                            genreCounts[genreIdStr] = (genreCounts[genreIdStr] || 0) + 1;
                        });
                    }
                });

                // Add counts to genre objects
                genres.forEach(genre => {
                    if (typeof genre.songCount === 'undefined') {
                        genre.songCount = genreCounts[genre._id.toString()] || 0;
                    }
                });
            }
        }

        res.json({ success: true, genres });
    } catch (error) {
        console.error("Error listing genres:", error);
        res.json({ success: false });
    }
};

const removeGenre = async (req, res) => {
    try {
        const { id } = req.body;

        // Start a session for transaction
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            // Find all songs that have this genre
            const songModel = mongoose.model('song');
            const songsWithGenre = await songModel.find({ genres: id }).session(session);

            console.log(`Found ${songsWithGenre.length} songs with genre ID ${id}`);

            // Remove this genre from all songs
            const songUpdatePromises = songsWithGenre.map(song => {
                // Filter out the genre ID from the genres array
                const updatedGenres = song.genres.filter(genreId =>
                    genreId.toString() !== id.toString()
                );

                return songModel.findByIdAndUpdate(
                    song._id,
                    { genres: updatedGenres },
                    { session, new: true }
                );
            });

            await Promise.all(songUpdatePromises);

            // Find all artists that have this genre
            const artistModel = mongoose.model('artist');
            const artistsWithGenre = await artistModel.find({ genres: id }).session(session);

            console.log(`Found ${artistsWithGenre.length} artists with genre ID ${id}`);

            // Remove this genre from all artists
            const artistUpdatePromises = artistsWithGenre.map(artist => {
                // Filter out the genre ID from the genres array
                const updatedGenres = artist.genres.filter(genreId =>
                    genreId.toString() !== id.toString()
                );

                return artistModel.findByIdAndUpdate(
                    artist._id,
                    { genres: updatedGenres },
                    { session, new: true }
                );
            });

            await Promise.all(artistUpdatePromises);

            // Delete the genre
            await genreModel.findByIdAndDelete(id).session(session);

            // Commit the transaction
            await session.commitTransaction();
            session.endSession();

            res.json({
                success: true,
                message: `Genre removed and removed from ${songsWithGenre.length} songs and ${artistsWithGenre.length} artists`
            });
        } catch (error) {
            // Abort transaction on error
            await session.abortTransaction();
            session.endSession();
            console.error("Transaction aborted:", error);
            res.json({
                success: false,
                message: "Error removing genre: " + error.message
            });
        }
    } catch (error) {
        console.error("Error removing genre:", error);
        res.json({
            success: false,
            message: "Error removing genre: " + error.message
        });
    }
};

const updateGenre = async (req, res) => {
    try {
        const { id, name } = req.body;

        if (!name || name.trim() === '') {
            return res.json({
                success: false,
                message: "Genre name is required"
            });
        }

        // Normalize the genre name for comparison
        const normalizedName = normalizeGenreName(name);

        if (normalizedName === '') {
            return res.json({
                success: false,
                message: "Genre name must contain at least one alphanumeric character"
            });
        }

        // Get all genres and check if any normalized name matches (excluding the current genre)
        const allGenres = await genreModel.find({ _id: { $ne: id } });
        const isDuplicate = allGenres.some(genre =>
            normalizeGenreName(genre.name) === normalizedName
        );

        if (isDuplicate) {
            return res.json({
                success: false,
                message: "A genre with this name already exists",
                isDuplicate: true
            });
        }

        // Update the genre with the new name
        await genreModel.findByIdAndUpdate(id, { name: name.trim() });

        res.json({ success: true, message: "Genre updated successfully" });
    } catch (error) {
        console.error("Error updating genre:", error);
        res.json({ success: false, message: "An error occurred while updating the genre" });
    }
};

export { addGenre, listGenre, removeGenre, updateGenre };
