import React, { useContext, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
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
  const [isRequestInProgress, setIsRequestInProgress] = useState(false);

  // Generate dynamic background color based on playlist name
  const generatePlaylistColor = (playlistName) => {
    if (!playlistName) return 'from-gray-800 to-gray-900';

    const colors = [
      'from-purple-800 to-purple-900',
      'from-blue-800 to-blue-900',
      'from-green-800 to-green-900',
      'from-red-800 to-red-900',
      'from-yellow-800 to-yellow-900',
      'from-pink-800 to-pink-900',
      'from-indigo-800 to-indigo-900',
      'from-teal-800 to-teal-900',
      'from-orange-800 to-orange-900',
      'from-cyan-800 to-cyan-900'
    ];

    // Create a simple hash from the playlist name
    let hash = 0;
    for (let i = 0; i < playlistName.length; i++) {
      hash = playlistName.charCodeAt(i) + ((hash << 5) - hash);
    }

    // Use the hash to select a color
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
  };

  useEffect(() => {
    let isMounted = true; // Flag to prevent state updates after unmount
    let timeoutId = null;

    const fetchPlaylist = async () => {
      if (!isMounted || isRequestInProgress) return;

      console.log(`[DisplayPlaylist] Starting to fetch playlist with ID: ${id}`);
      setIsRequestInProgress(true);
      setIsLoading(true);
      setError('');

      // Set a timeout to prevent infinite loading
      timeoutId = setTimeout(() => {
        if (isMounted) {
          console.error('[DisplayPlaylist] Request timed out');
          setError('Request timed out. Please try again.');
          setIsLoading(false);
          setIsRequestInProgress(false);
        }
      }, 10000); // 10 second timeout

      try {
        if (!id) {
          console.error('[DisplayPlaylist] No playlist ID provided');
          setError('Invalid playlist ID');
          setIsLoading(false);
          return;
        }

        const clerkId = user?.id || '';
        console.log(`[DisplayPlaylist] Fetching playlist with ID: ${id}, clerkId: ${clerkId}`);

        const result = await loadPlaylist(id, clerkId);
        console.log(`[DisplayPlaylist] Load playlist result:`, result);

        // Clear timeout since we got a response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }

        if (!isMounted) {
          console.log('[DisplayPlaylist] Component unmounted, skipping state update');
          return; // Check if component is still mounted
        }

        if (!result.success) {
          console.error('[DisplayPlaylist] Failed to load playlist:', result.message);
          setError(result.message || 'Failed to load playlist');
        } else {
          console.log('[DisplayPlaylist] Playlist loaded successfully:', result.playlist);

          // Verify that songs are properly populated
          if (!result.playlist.songs) {
            console.error('[DisplayPlaylist] Playlist songs array is undefined');
            setError('Playlist data is incomplete');
            return;
          }

          // Check if the current user is the owner of the playlist
          if (result.playlist.creator && user) {
            const isOwnerCheck = result.playlist.creator._id === user.id ||
                      (result.playlist.creator.clerkId && result.playlist.creator.clerkId === user.id);
            console.log(`[DisplayPlaylist] Owner check: ${isOwnerCheck}`);
            setIsOwner(isOwnerCheck);
          }
        }
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        if (!isMounted) return;
        console.error('[DisplayPlaylist] Error loading playlist:', error);
        setError(`An unexpected error occurred: ${error.message}`);
      } finally {
        if (isMounted) {
          console.log('[DisplayPlaylist] Setting loading to false');
          setIsLoading(false);
          setIsRequestInProgress(false);
        }
      }
    };

    // Fetch playlist immediately
    fetchPlaylist();

    // Cleanup function to reset state when component unmounts or ID changes
    return () => {
      isMounted = false; // Mark as unmounted
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      console.log('[DisplayPlaylist] Component cleanup');
    };
  }, [id]);

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
      <div className="h-full w-full flex flex-col items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
        <p className="text-lg">Loading playlist...</p>
        <p className="text-gray-400 text-sm mt-2">Playlist ID: {id}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-white">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold mb-4">Playlist Not Found</h2>
          <p className="text-gray-400 mb-2">Error: {error}</p>
          <p className="text-gray-400 mb-6">The playlist might be private, deleted, or doesn't exist.</p>
          <p className="text-sm text-gray-500 mb-6">Playlist ID: {id}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-3 bg-white text-black font-bold rounded-full hover:scale-105 transition-transform"
          >
            Go Back
          </button>
        </div>
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
      {/* Main Content with Gradient Background */}
      <div className={`bg-gradient-to-b ${generatePlaylistColor(currentPlaylist?.name)} via-transparent to-black`}>
        {/* Playlist Header */}
        <div className="p-6 pt-6">
          <div className="flex flex-col md:flex-row items-center md:items-end gap-6 mb-8">
            <img
              src={currentPlaylist.image}
              alt={currentPlaylist.name}
              className="w-48 h-48 object-cover shadow-2xl rounded"
            />

            <div className="flex flex-col items-center md:items-start">
              <p className="text-xs uppercase font-bold tracking-wider opacity-80">Playlist</p>
              <h1 className="text-4xl md:text-7xl font-black my-4 leading-none">{currentPlaylist.name}</h1>

              {currentPlaylist.description && (
                <p className="text-gray-300 mb-4 text-sm">{currentPlaylist.description}</p>
              )}

              <div className="flex items-center text-sm">
                <span className="font-bold text-white">{currentPlaylist.creator?.fullName || 'Unknown'}</span>
                <span className="mx-2 text-gray-400">•</span>
                <span className="text-gray-300">{currentPlaylist.songs.length} songs</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-6 mb-8">
            <button
              onClick={handlePlayPause}
              className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center hover:bg-green-400 hover:scale-105 transition-all duration-200 shadow-lg"
            >
              {playStatus && track && currentPlaylist.songs.some(song => song._id === track._id) ? (
                <img src={assets.pause_icon} alt="Pause" className="w-7 h-7" />
              ) : (
                <img src={assets.play_icon} alt="Play" className="w-7 h-7 ml-1" />
              )}
            </button>

            <button
              onClick={() => setShowAddSongsModal(true)}
              className="px-6 py-2 rounded-full bg-transparent border border-gray-400 text-white flex items-center gap-2 hover:border-white hover:scale-105 transition-all duration-200 group"
              title="Add songs to playlist"
            >
              <img src={assets.plus_icon} alt="Add" className="w-4 h-4 opacity-80 group-hover:opacity-100 transition-all duration-200" />
              <span className="font-medium text-sm">Add songs</span>
            </button>

            <button
              onClick={() => setShowManagePlaylist(true)}
              className="w-8 h-8 rounded-full bg-transparent flex items-center justify-center hover:bg-white hover:bg-opacity-10 transition-all duration-200"
              title="Playlist options"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="opacity-60 hover:opacity-100">
                <path d="M9.5 13a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0zm0-5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Songs List */}
        <div className="px-6 pb-6">
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
            <div className="flex flex-col bg-black bg-opacity-20 rounded-lg">
              {/* Header */}
              <div className="grid grid-cols-[16px_4fr_3fr_1fr] gap-4 px-4 py-3 border-b border-gray-700 border-opacity-50 text-gray-400 text-sm font-medium">
                <span>#</span>
                <span>Title</span>
                <span>Album</span>
                <span className="flex justify-end">
                  <img src={assets.clock_icon} alt="Duration" className="w-4 opacity-70" />
                </span>
              </div>

              {/* Songs */}
              {currentPlaylist.songs.map((song, index) => (
                <div
                  key={song._id}
                  className="grid grid-cols-[16px_4fr_3fr_1fr] gap-4 px-4 py-2 cursor-pointer"
                  onClick={() => playWithId(song._id)}
                >
                  <div className="flex items-center justify-center">
                    <span>{index + 1}</span>
                  </div>

                  <div className="flex items-center gap-3 overflow-hidden">
                    <img
                      src={song.image}
                      alt={song.name}
                      className="w-10 h-10 object-cover rounded"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-white">
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
                        className="text-gray-400 p-1"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSong(song._id);
                        }}
                        title="Remove from playlist"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                          <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
                        </svg>
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
              <button
                onClick={() => setShowManagePlaylist(false)}
                className="text-gray-400 hover:text-white ml-auto"
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
