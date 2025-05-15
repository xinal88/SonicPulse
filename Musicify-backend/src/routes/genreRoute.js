import express from 'express';
import { addGenre, listGenre, removeGenre } from '../controllers/genreController.js';

const genreRouter = express.Router();

genreRouter.post('/add', addGenre);
genreRouter.get('/list', listGenre);
genreRouter.post('/remove', removeGenre);

export default genreRouter;
