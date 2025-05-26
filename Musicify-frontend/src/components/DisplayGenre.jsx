import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/frontend-assets/assets';

const DisplayGenre = () => {
  const { genreId } = useParams();
  const { playWithId, songsData, genresData, artistsData } = useContext(PlayerContext);
  const url = 'http://localhost:4000';
  const [genreSongs, setGenreSongs] = useState([]);
  const [genre, setGenre] = useState(null);
  const [songsByArtist, setSongsByArtist] = useState({});

  // Find the genre by ID
  useEffect(() => {
    if (genresData.length > 0 && genreId) {
      const foundGenre = genresData.find(g => g._id === genreId);
      if (foundGenre) {
        setGenre(foundGenre);
      }
    }
  }, [genresData, genreId]);

  // Fetch songs for this genre and group them by artist
  useEffect(() => {
    const fetchGenreSongs = async () => {
      if (genre) {
        try {
          // Fetch the genre with its songList populated
          const response = await axios.get(`${url}/api/genre/list`, {
            params: {
              includeSongs: 'true',
              id: genreId
            }
          });

          if (response.data.success) {
            const genres = response.data.genres;
            const currentGenre = genres.find(g => g._id === genreId);

            if (currentGenre && currentGenre.songList) {
              // If songList is populated, use it directly
              if (Array.isArray(currentGenre.songList) && currentGenre.songList.length > 0 &&
                  typeof currentGenre.songList[0] === 'object') {
                setGenreSongs(currentGenre.songList);

                // Group songs by artist
                const byArtist = {};

                currentGenre.songList.forEach(song => {
                  // Get the first artist ID from the song
                  let artistId;

                  if (Array.isArray(song.artist) && song.artist.length > 0) {
                    // If artist is an array, use the first artist
                    artistId = song.artist[0];
                  } else if (typeof song.artist === 'string' || typeof song.artist === 'object') {
                    // If artist is a string or object (ObjectId), use it directly
                    artistId = song.artist;
                  }

                  if (artistId) {
                    if (!byArtist[artistId]) {
                      byArtist[artistId] = [];
                    }

                    // Add song to the artist's list
                    byArtist[artistId].push(song);
                  }
                });

                setSongsByArtist(byArtist);
              } else {
                // Fallback to filtering songsData if songList is not populated
                fallbackToClientSideFiltering();
              }
            } else {
              // Fallback to filtering songsData if genre not found
              fallbackToClientSideFiltering();
            }
          } else {
            // Fallback to filtering songsData if API call fails
            fallbackToClientSideFiltering();
          }
        } catch (error) {
          console.error("Error fetching genre songs:", error);
          // Fallback to filtering songsData if API call fails
          fallbackToClientSideFiltering();
        }
      }
    };

    // Fallback function that uses client-side filtering (original implementation)
    const fallbackToClientSideFiltering = () => {
      if (songsData.length > 0 && genre) {
        // Find songs with this genre
        const songs = songsData.filter(song => {
          if (!song.genres) return false;

          // Check if the genre ID is in the song's genres array
          return song.genres.some(g => {
            // Handle both string and object IDs
            if (typeof g === 'string') {
              return g === genreId;
            } else if (g && typeof g === 'object') {
              return g.toString() === genreId.toString();
            }
            return false;
          });
        });

        setGenreSongs(songs);

        // Group all songs by artist (using only the first artist in the list for grouping)
        const byArtist = {};

        songs.forEach(song => {
          // Get the first artist ID from the song
          let artistId;

          if (Array.isArray(song.artist) && song.artist.length > 0) {
            // If artist is an array, use the first artist
            artistId = song.artist[0];
          } else if (typeof song.artist === 'string' || typeof song.artist === 'object') {
            // If artist is a string or object (ObjectId), use it directly
            artistId = song.artist;
          }

          if (artistId) {
            if (!byArtist[artistId]) {
              byArtist[artistId] = [];
            }

            // Add all songs to the artist (no limit)
            byArtist[artistId].push(song);
          }
        });

        setSongsByArtist(byArtist);
      }
    };

    fetchGenreSongs();
  }, [genre, genreId, songsData, url]);

  // Calculate total duration of songs
  const calculateTotalDuration = (songs) => {
    if (!songs || songs.length === 0) return '';

    let totalMinutes = 0;
    let totalSeconds = 0;

    songs.forEach(song => {
      if (song.duration) {
        const [minutes, seconds] = song.duration.split(':').map(Number);
        totalMinutes += minutes || 0;
        totalSeconds += seconds || 0;
      }
    });

    // Convert excess seconds to minutes
    totalMinutes += Math.floor(totalSeconds / 60);
    totalSeconds = totalSeconds % 60;

    // Format the total duration
    const hours = Math.floor(totalMinutes / 60);
    const remainingMinutes = totalMinutes % 60;

    if (hours > 0) {
      return `about ${hours} hr ${remainingMinutes > 0 ? remainingMinutes + ' min' : ''}`;
    } else {
      return `about ${remainingMinutes} min`;
    }
  };

  if (!genre) return null;

  return (
    <>
      <div className='px-6'>
        <div className='mt-10'>
          <h2 className='text-5xl font-bold mb-4 md:text-7xl'>{genre.name}</h2>
          <p className='mt-1'>
            <img className='inline-block w-5' src={assets.musicify_logo} alt="" />
            <b>Musicify</b>
            • {genreSongs.length} songs
            • {calculateTotalDuration(genreSongs)}
          </p>
        </div>
      </div>

      <div className='px-6'>
        {/* Message when no songs are found */}
        {genreSongs.length === 0 && (
          <div className='mt-10 text-center'>
            <h3 className='text-2xl font-bold mb-4'>No songs found</h3>
            <p className='text-gray-400'>There are no songs in this genre yet.</p>
          </div>
        )}

        {/* Display songs by artist */}
        {Object.keys(songsByArtist).map(artistId => {
          const artistSongs = songsByArtist[artistId];
          const artist = artistsData.find(a => a._id === artistId);
          const artistName = artist ? artist.name : "Unknown Artist";

          return (
            <div className='mt-10' key={artistId}>
              <div className='flex items-center gap-4 mb-4'>
                {artist && <img className='w-16 h-16 rounded-full object-cover' src={artist.image} alt={artistName} />}
                <h3 className='text-2xl font-bold'>{artistName}</h3>
              </div>
              <div className='grid grid-cols-3 sm:grid-cols-4 mb-4 pl-2 text-[#a7a7a7]'>
                <p><b className='mr-4'>#</b>Title</p>
                <p>Album</p>
                <p className='hidden sm:block'>Date Added</p>
                <img className='m-auto w-4' src={assets.clock_icon} alt="" />
              </div>
              <hr />
              {artistSongs.map((song, index) => (
                <div
                  onClick={() => playWithId(song._id)}
                  key={index}
                  className='grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 items-center text-[#a7a7a7] hover:bg-[#ffffff2b] cursor-pointer'
                >
                  <p className='text-white flex items-center'>
                    <b className='mr-4 text-[#a7a7a7]'>{index + 1}</b>
                    <img className='w-10 mr-5' src={song.image} alt="" />
                    <span className="flex flex-col">
                      <span>{song.name}</span>
                      <span className="text-sm text-[#a7a7a7]">{song.artistName || artistName}</span>
                    </span>
                  </p>
                  <p className='text-[15px]'>{song.album}</p>
                  <p className='text-[15px] hidden sm:block'>5 days ago</p>
                  <p className='text-center'>{song.duration}</p>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default DisplayGenre;
