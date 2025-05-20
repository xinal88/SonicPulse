import {addSong, listSong, removeSong, updateSong, uploadSong, findMatches, downloadSong} from "../controllers/songController.js";
import express from 'express';
import upload from "../middleware/multer.js";
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const songRouter = express.Router();

// Ensure the uploads directory exists
try {
    await fs.mkdir('uploads', { recursive: true });
} catch (err) {
    console.error('Error creating uploads directory:', err);
}

// Original Musicify routes
songRouter.post('/add', upload.fields([
    {name:'image', maxCount:1},
    {name:'audio', maxCount:1},
    {name:'lrc', maxCount:1}
]), addSong);
songRouter.get('/list', listSong);
songRouter.post('/remove', removeSong);
songRouter.post('/update', upload.fields([
    {name:'image', maxCount:1},
    {name:'audio', maxCount:1},
    {name:'lrc', maxCount:1}
]), updateSong);

// Added routes from SeekTune
songRouter.post('/upload', upload.single('audio'), uploadSong);
songRouter.post('/find', upload.single('sample'), findMatches);
songRouter.post('/download', downloadSong);

// Ensure the route path matches what we're calling from the frontend
// Note that in your server.js, you're mounting these routes at /api/song (not /api/songs)

// Make sure the /find route is properly configured
songRouter.post('/find', upload.single('sample'), findMatches);

// You can remove the /find-matches route to avoid confusion
// songRouter.post('/find-matches', upload.single('sample'), findMatches);

export default songRouter;
