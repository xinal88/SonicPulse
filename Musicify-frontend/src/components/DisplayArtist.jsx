import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import Navbar from './Navbar';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/frontend-assets/assets';

const DisplayArtist = () => {
  const { id } = useParams();
  const { playWithId, songsData, albumsData, artistsData } = useContext(PlayerContext);
  const [artistSongs, setArtistSongs] = useState([]);
  const [songsByAlbum, setSongsByAlbum] = useState({});
  const [nonAlbumSongs, setNonAlbumSongs] = useState([]);
  const [artist, setArtist] = useState(null);

  useEffect(() => {
    if (artistsData.length > 0 && id) {
      // Find the artist by ID
      const foundArtist = artistsData.find(artist => artist._id === id);
      if (foundArtist) {
        setArtist(foundArtist);
      }
    }
  }, [artistsData, id]);

  useEffect(() => {
    if (songsData.length > 0 && artist) {
      console.log("Artist ID:", artist._id);
      console.log("Artist Name:", artist.name);
      console.log("Total songs in database:", songsData.length);

      // Get all songs by this artist
      const songs = songsData.filter(song => {
        try {
          // Check if song.artist is an array (new structure)
          if (Array.isArray(song.artist)) {
            // Check if the artist ID is in the array (either as a string or as is)
            const includes = song.artist.some(artistId => {
              if (!artistId) return false;
              try {
                return artistId === artist._id ||
                       artistId.toString() === artist._id.toString();
              } catch (e) {
                console.error("Error comparing artist IDs:", e);
                return artistId === artist._id;
              }
            });
            console.log(`Song ${song.name} has artists:`, song.artist, `Includes ${artist._id}:`, includes);
            return includes;
          }

          // Fallback for old structure where song.artist is a string
          if (!song.artist) return false;

          try {
            const equals = song.artist === artist._id ||
                          song.artist.toString() === artist._id.toString();
            console.log(`Song ${song.name} has artist:`, song.artist, `Equals ${artist._id}:`, equals);
            return equals;
          } catch (e) {
            console.error("Error comparing artist ID:", e);
            return song.artist === artist._id;
          }
        } catch (e) {
          console.error("Error filtering song:", song.name, e);
          return false;
        }
      });

      console.log("Filtered songs for this artist:", songs.length);
      setArtistSongs(songs);

      // Group songs by album
      const byAlbum = {};
      const noAlbum = [];

      songs.forEach(song => {
        if (song.album && song.album !== 'none' && song.album !== '') {
          if (!byAlbum[song.album]) {
            byAlbum[song.album] = [];
          }
          byAlbum[song.album].push(song);
        } else {
          noAlbum.push(song);
        }
      });

      setSongsByAlbum(byAlbum);
      setNonAlbumSongs(noAlbum);
    }
  }, [songsData, artist]);

  // Calculate total duration of all songs
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

  if (!artist) return null;

  // Create a style object for the header section without background gradient
  const headerStyle = {
    paddingTop: '2rem',
    paddingBottom: '2rem',
    marginBottom: '2rem'
  };

  return (
    <>
      <Navbar showNavigation={false} />
      <div style={headerStyle} className='px-6'>
        <div className='mt-10 flex gap-8 flex-col md:flex-row md:items-end'>
          <div className='w-48 h-48 rounded-full overflow-hidden'>
            <img className='w-full h-full object-cover' src={artist.image} alt={artist.name} />
          </div>
          <div className='flex flex-col'>
            <p>Artist</p>
            <h2 className='text-5xl font-bold mb-4 md:text-7xl'>{artist.name}</h2>
            <p className='mt-1'>
              <img className='inline-block w-5' src={assets.spotify_logo} alt="" />
              <b>Spotify</b>
              • {artistSongs.length} songs
              • {calculateTotalDuration(artistSongs)}
            </p>
          </div>
        </div>
      </div>

      <div className='px-6'>
        {/* Message when no songs are found */}
        {artistSongs.length === 0 && (
          <div className='mt-10 text-center'>
            <h3 className='text-2xl font-bold mb-4'>No songs found</h3>
            <p className='text-gray-400'>This artist doesn't have any songs in the library yet.</p>
          </div>
        )}

        {/* Non-album songs section */}
        {nonAlbumSongs.length > 0 && (
        <div className='mt-10'>
          <h3 className='text-2xl font-bold mb-4'>Singles</h3>
          <div className='grid grid-cols-3 sm:grid-cols-4 mb-4 pl-2 text-[#a7a7a7]'>
            <p><b className='mr-4'>#</b>Title</p>
            <p>Album</p>
            <p className='hidden sm:block'>Date Added</p>
            <img className='m-auto w-4' src={assets.clock_icon} alt="" />
          </div>
          <hr />
          {nonAlbumSongs.map((song, index) => (
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
                  <span className="text-sm text-[#a7a7a7]">{song.artistName || artist.name}</span>
                </span>
              </p>
              <p className='text-[15px]'>Single</p>
              <p className='text-[15px] hidden sm:block'>5 days ago</p>
              <p className='text-center'>{song.duration}</p>
            </div>
          ))}
        </div>
      )}

      {/* Albums sections */}
      {Object.keys(songsByAlbum).map(albumId => {
        const albumSongs = songsByAlbum[albumId];
        const album = albumsData.find(a => a._id === albumId || a.name === albumId);
        const displayName = album ? album.name : albumId;

        return (
          <div className='mt-10' key={albumId}>
            <div className='flex items-center gap-4 mb-4'>
              {album && <img className='w-16 h-16 rounded' src={album.image} alt={displayName} />}
              <h3 className='text-2xl font-bold'>{displayName}</h3>
            </div>
            <div className='grid grid-cols-3 sm:grid-cols-4 mb-4 pl-2 text-[#a7a7a7]'>
              <p><b className='mr-4'>#</b>Title</p>
              <p>Album</p>
              <p className='hidden sm:block'>Date Added</p>
              <img className='m-auto w-4' src={assets.clock_icon} alt="" />
            </div>
            <hr />
            {albumSongs.map((song, index) => (
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
                    <span className="text-sm text-[#a7a7a7]">{song.artistName || artist.name}</span>
                  </span>
                </p>
                <p className='text-[15px]'>{displayName}</p>
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

export default DisplayArtist;
