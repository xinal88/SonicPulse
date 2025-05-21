import express from 'express'
import {addArtist, listArtist, removeArtist, updateArtist} from '../controllers/artistController.js'
import upload from '../middleware/multer.js'

const artistRouter = express.Router();

artistRouter.post('/add', upload.single('image'), addArtist);
artistRouter.get('/list', listArtist);
artistRouter.post('/remove', removeArtist);
artistRouter.post('/update', upload.single('image'), updateArtist);

export default artistRouter;
