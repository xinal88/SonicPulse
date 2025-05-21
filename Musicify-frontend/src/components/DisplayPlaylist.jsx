import React, { useContext, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import Navbar from './Navbar';
import { assets } from '../assets/frontend-assets/assets';
import SongItem from './SongItem';
import SearchSongsModal from './SearchSongsModal';
import PlaylistManagement from './PlaylistManagement';

const DisplayPlaylist = () => {
  const { id } = useParams();
  const { user } = useUser();
  const {
    loadPlaylist,
    currentPlaylist,
    playPlaylist,
    playWithId,
    playStatus,
    play,
    pause,
    track,
    removeSongFromPlaylist
  } = useContext(PlayerContext);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [showAddSongsModal, setShowAddSongsModal] = useState(false);
  const [showManagePlaylist, setShowManagePlaylist] = useState(false);

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount

    const fetchPlaylist = async () => {
      if (!isMounted) return;

      setIsLoading(true);
      setError('');

      try {
        if (!id) {
          setError('Invalid playlist ID');
          setIsLoading(false);
          return;
        }

        const clerkId = user?.id || '';
        console.log(`Fetching playlist with ID: ${id}, clerkId: ${clerkId}`);

        const result = await loadPlaylist(id, clerkId);

        if (!isMounted) return; // Check if component is still mounted

        if (!result.success) {
          console.error('Failed to load playlist:', result.message);
          setError(result.message || 'Failed to load playlist');
        } else {
          console.log('Playlist loaded successfully:', result.playlist);

          // Verify that songs are properly populated
          if (!result.playlist.songs) {
            console.error('Playlist songs array is undefined');
            setError('Playlist data is incomplete');
            return;
          }

          // Check if the current user is the owner of the playlist
          if (result.playlist.creator && user) {
            setIsOwner(result.playlist.creator._id === user.id ||
                      (result.playlist.creator.clerkId && result.playlist.creator.clerkId === user.id));
          }
        }
      } catch (error) {
        if (!isMounted) return;
        console.error('Error loading playlist:', error);
        setError('An unexpected error occurred');
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchPlaylist();

    // Cleanup function to reset state when component unmounts or ID changes
    return () => {
      isMounted = false; // Mark as unmounted
      // Don't set loading to true on unmount as it causes flickering
    };
  }, [id, user, loadPlaylist]);

  const handlePlayAll = () => {
    if (currentPlaylist && currentPlaylist.songs && currentPlaylist.songs.length > 0) {
      console.log(`Playing all songs from playlist: ${currentPlaylist._id}`);
      playPlaylist(currentPlaylist._id, user?.id || '')
        .then(result => {
          if (!result.success) {
            console.error(`Failed to play playlist: ${result.message}`);
          }
        })
        .catch(error => {
          console.error('Error playing playlist:', error);
        });
    } else {
      console.log('Cannot play playlist: No songs available');
    }
  };

  const handlePlayPause = () => {
    if (!currentPlaylist || !currentPlaylist.songs) {
      console.error('Cannot play/pause: Playlist data is incomplete');
      return;
    }

    if (playStatus) {
      console.log('Pausing playback');
      pause();
    } else if (track && currentPlaylist.songs.some(song => song._id === track._id)) {
      console.log('Resuming playback of current track');
      play();
    } else {
      console.log('Starting playlist playback');
      handlePlayAll();
    }
  };

  const handlePlaySong = (songId) => {
    if (!currentPlaylist || !songId) {
      console.error('Cannot play song: Invalid data');
      return;
    }

    console.log(`Playing song ${songId} from playlist ${currentPlaylist._id}`);
    playWithId(songId);
  };

  const handleRemoveSong = async (songId) => {
    if (!user || !isOwner || !currentPlaylist) return;

    try {
      const result = await removeSongFromPlaylist(currentPlaylist._id, songId, user.id);
      if (!result.success) {
        console.error('Failed to remove song:', result.message);
      }
    } catch (error) {
      console.error('Error removing song:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-white">
        <p className="text-xl mb-4">Error: {error}</p>
        <p>The playlist might be private or doesn't exist.</p>
      </div>
    );
  }

  if (!currentPlaylist) {
    return (
      <div className="h-full w-full flex items-center justify-center text-white">
        <p>Playlist not found</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto text-white">
      <Navbar />

      <div className="p-6">
        {/* Playlist Header */}
        <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
          <img
            src={currentPlaylist.image}
            alt={currentPlaylist.name}
            className="w-48 h-48 object-cover shadow-lg"
          />

          <div className="flex flex-col items-center md:items-start">
            <p className="text-xs uppercase font-bold">Playlist</p>
            <h1 className="text-4xl md:text-6xl font-bold my-2">{currentPlaylist.name}</h1>

            {currentPlaylist.description && (
              <p className="text-gray-400 mb-2">{currentPlaylist.description}</p>
            )}

            <div className="flex items-center text-sm text-gray-400">
              <span className="font-bold text-white">{currentPlaylist.creator?.fullName || 'Unknown'}</span>
              <span className="mx-1">•</span>
              <span>{currentPlaylist.songs.length} songs</span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handlePlayPause}
            className="w-14 h-14 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400"
          >
            {playStatus && track && currentPlaylist.songs.some(song => song._id === track._id) ? (
              <img src={assets.pause_icon} alt="Pause" className="w-6 h-6" />
            ) : (
              <img src={assets.play_icon} alt="Play" className="w-6 h-6" />
            )}
          </button>

          <button
            onClick={() => setShowAddSongsModal(true)}
            className="px-4 py-2 rounded-full bg-transparent border border-white text-white flex items-center gap-2 hover:bg-white hover:bg-opacity-10"
            title="Add songs to playlist"
          >
            <img src={assets.plus_icon} alt="Add" className="w-4 h-4" />
            <span>Add songs</span>
          </button>

          <div className="flex items-center gap-2">
            {/* More options button - visible to everyone */}
            <button
              onClick={() => setShowManagePlaylist(true)}
              className="w-8 h-8 rounded-full bg-[#282828] flex items-center justify-center hover:bg-[#3e3e3e]"
              title="Playlist options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Songs List */}
        <div className="mt-6">
          {currentPlaylist.songs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 mb-4">This playlist is empty</p>
              <button
                onClick={() => setShowAddSongsModal(true)}
                className="px-6 py-3 rounded-full bg-white text-black font-bold hover:scale-105 transition-transform"
              >
                Add Songs
              </button>
            </div>
          ) : (
            <div className="flex flex-col">
              {/* Header */}
              <div className="grid grid-cols-[16px_4fr_3fr_1fr] gap-4 px-4 py-2 border-b border-gray-800 text-gray-400 text-sm">
                <span>#</span>
                <span>Title</span>
                <span>Album</span>
                <span className="flex justify-end">
                  <img src={assets.clock_icon} alt="Duration" className="w-5" />
                </span>
              </div>

              {/* Songs */}
              {currentPlaylist.songs.map((song, index) => (
                <div
                  key={song._id}
                  className={`grid grid-cols-[16px_4fr_3fr_1fr] gap-4 px-4 py-2 hover:bg-[#ffffff1a] rounded group ${
                    track && track._id === song._id ? 'bg-[#ffffff33]' : ''
                  }`}
                >
                  <div className="flex items-center justify-center">
                    {track && track._id === song._id && playStatus ? (
                      <div className="w-4 h-4 flex items-center justify-center">
                        <span className="animate-pulse text-green-500">▶</span>
                      </div>
                    ) : (
                      <span className="group-hover:hidden">{index + 1}</span>
                    )}
                    <img
                      src={assets.play_icon}
                      alt="Play"
                      className="w-4 h-4 hidden group-hover:block cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlaySong(song._id);
                      }}
                    />
                  </div>

                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={song.image}
                      alt={song.name}
                      className="w-10 h-10 object-cover"
                    />
                    <div className="min-w-0">
                      <p className={`truncate ${track && track._id === song._id ? 'text-green-500' : 'text-white'}`}>
                        {song.name}
                      </p>
                      <p className="text-sm text-gray-400 truncate">{song.artistName}</p>
                    </div>
                  </div>

                  <div className="flex items-center text-gray-400 text-sm">
                    <span className="truncate">{song.album}</span>
                  </div>

                  <div className="flex items-center justify-end gap-4">
                    {isOwner && (
                      <button
                        className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveSong(song._id)}
                      >
                        ✕
                      </button>
                    )}
                    <span className="text-gray-400 text-sm">{song.duration}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Songs Modal */}
      {showAddSongsModal && (
        <SearchSongsModal
          playlistId={currentPlaylist._id}
          onClose={() => setShowAddSongsModal(false)}
          onSongAdded={() => {
            // The playlist will be automatically updated by the context
            console.log('Song added to playlist');
          }}
        />
      )}

      {/* Playlist Management Modal */}
      {showManagePlaylist && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
          <div className="bg-[#282828] p-6 rounded-md w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Manage Playlist</h2>
              <button
                onClick={() => setShowManagePlaylist(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <PlaylistManagement
              playlistId={currentPlaylist._id}
              onClose={() => setShowManagePlaylist(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default DisplayPlaylist;
