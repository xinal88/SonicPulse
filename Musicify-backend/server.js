import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import songRouter from './src/routes/songRoute.js';
import connectDB from './src/config/mongodb.js';
import connectCloudinary from './src/config/cloudinary.js';
import albumRouter from './src/routes/albumRoute.js';
import userRouter from './src/routes/userRoute.js';
import authRouter from './src/routes/authRoute.js';

import { clerkMiddleware } from '@clerk/express';

// app config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// middlewares
app.use(express.json());
app.use(cors());
app.use(clerkMiddleware());

// initializing routes
app.use("/api/song", songRouter)
app.use("/api/album", albumRouter)
app.use("/api/users", userRouter)
app.use("/api/auth", authRouter)

app.get('/', (req,res) => res.send("API Working"))

app.listen(port, () => console.log(`Server started on ${port}`))