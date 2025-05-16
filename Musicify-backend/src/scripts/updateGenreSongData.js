import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// MongoDB connection string - use a longer timeout
const MONGODB_URI = process.env.MONGODB_URL || 'mongodb://localhost:27017/musicify';
const MONGODB_OPTIONS = {
  serverSelectionTimeoutMS: 30000, // 30 seconds timeout
  connectTimeoutMS: 30000
};

console.log('Connecting to MongoDB...');
console.log(`Connection string: ${MONGODB_URI}`);

// Connect to MongoDB
mongoose.connect(MONGODB_URI, MONGODB_OPTIONS)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Import models directly to avoid import issues
const genreSchema = new mongoose.Schema({
  name: {type: String, required: true, unique: true},
  songList: [{type: mongoose.Schema.Types.ObjectId, ref: 'song'}],
  songCount: {type: Number, default: 0}
});

const songSchema = new mongoose.Schema({
  name: {type: String, required: true},
  artist: [{type: mongoose.Schema.Types.ObjectId, ref: 'artist'}],
  artistName: {type: String, default: ""},
  album: {type: String, required: true},
  image: { type: String, required: true},
  file: {type: String, required: true},
  duration: {type: String, required: true},
  lrcFile: {type: String, default: ""},
  genres: [{type: mongoose.Schema.Types.ObjectId, ref: 'genre'}]
});

const genreModel = mongoose.models.genre || mongoose.model('genre', genreSchema);
const songModel = mongoose.models.song || mongoose.model('song', songSchema);

/**
 * Update all genres with songList and songCount data
 */
const updateGenreSongData = async () => {
  try {
    console.log('Starting genre song data update...');

    // Get all genres
    const genres = await genreModel.find();
    console.log(`Found ${genres.length} genres`);

    // Get all songs with genres
    const songs = await songModel.find({ genres: { $exists: true, $ne: [] } });
    console.log(`Found ${songs.length} songs with genres`);

    // Create a map to store songs per genre
    const genreSongs = {};

    // Group songs by genre
    songs.forEach(song => {
      if (song.genres && song.genres.length > 0) {
        song.genres.forEach(genreId => {
          const genreIdStr = genreId.toString();

          if (!genreSongs[genreIdStr]) {
            genreSongs[genreIdStr] = [];
          }

          genreSongs[genreIdStr].push(song._id);
        });
      }
    });

    // Start a session for transaction
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // Update each genre
      let updatedCount = 0;
      for (const genre of genres) {
        const genreId = genre._id.toString();
        const songList = genreSongs[genreId] || [];

        await genreModel.findByIdAndUpdate(
          genreId,
          {
            songList,
            songCount: songList.length
          },
          { session }
        );

        updatedCount++;
        console.log(`Updated genre "${genre.name}" with ${songList.length} songs`);
      }

      // Commit the transaction
      await session.commitTransaction();
      session.endSession();

      console.log(`Successfully updated ${updatedCount} genres`);

      // Close the connection properly
      await mongoose.connection.close();
      console.log('MongoDB connection closed');
      process.exit(0);
    } catch (error) {
      // Abort transaction on error
      await session.abortTransaction();
      session.endSession();
      console.error('Transaction aborted:', error);

      // Close the connection properly
      await mongoose.connection.close();
      process.exit(1);
    }
  } catch (error) {
    console.error('Error updating genre song data:', error);

    // Close the connection properly
    if (mongoose.connection) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
};

// Run the update function
updateGenreSongData();
