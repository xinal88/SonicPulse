import express from 'express';
import {
    createPlaylist,
    listPlaylists,
    getPlaylist,
    updatePlaylist,
    deletePlaylist,
    addSongToPlaylist,
    removeSongFromPlaylist,
    reorderSongs
} from '../controllers/playlistController.js';
import upload from '../middleware/multer.js';

const playlistRouter = express.Router();

// Create a new playlist
playlistRouter.post('/create', upload.single('image'), createPlaylist);

// Get all playlists (with optional filtering)
playlistRouter.get('/list', listPlaylists);

// Get a single playlist by ID
playlistRouter.get('/get', getPlaylist);

// Update a playlist
playlistRouter.post('/update', upload.single('image'), updatePlaylist);

// Delete a playlist
playlistRouter.post('/delete', deletePlaylist);

// Add a song to a playlist
playlistRouter.post('/add-song', addSongToPlaylist);

// Remove a song from a playlist
playlistRouter.post('/remove-song', removeSongFromPlaylist);

// Reorder songs in a playlist
playlistRouter.post('/reorder-songs', reorderSongs);

export default playlistRouter;
