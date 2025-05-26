import React, { useContext, useState, useEffect } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import { assets } from '../assets/frontend-assets/assets';
import axios from 'axios';

const url = 'http://localhost:4000';

const AddToPlaylistModal = ({ songId, onClose }) => {
  const { playlistsData, setPlaylistsData, addSongToPlaylist, createPlaylist } = useContext(PlayerContext);
  const { user, isSignedIn } = useUser();

  const [userPlaylists, setUserPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  // Function to refresh playlists from the server
  const refreshPlaylists = async () => {
    if (!isSignedIn || !user) return;

    setIsLoading(true);
    setError('');

    try {
      console.log("Refreshing playlists for user:", user.id);

      // Get user's playlists including private ones
      const response = await axios.get(`${url}/api/playlist/list`, {
        params: {
          clerkId: user.id,
          includePrivate: 'true'
        }
      });

      if (response.data.success) {
        console.log(`Refreshed ${response.data.playlists.length} playlists for user`);
        // Update the global playlists data
        setPlaylistsData(prevPlaylists => {
          // Keep playlists that don't belong to this user
          const otherPlaylists = prevPlaylists.filter(playlist =>
            !playlist.creator ||
            (playlist.creator.clerkId !== user.id && playlist.creator._id !== user.id)
          );

          // Create a map to track all playlists by ID to prevent duplicates
          const playlistMap = new Map();

          // Add other playlists to the map
          otherPlaylists.forEach(playlist => {
            if (playlist._id) {
              playlistMap.set(playlist._id, playlist);
            }
          });

          // Add user's refreshed playlists to the map (will overwrite any duplicates)
          response.data.playlists.forEach(playlist => {
            if (playlist._id) {
              playlistMap.set(playlist._id, playlist);
            }
          });

          // Convert the map values back to an array
          return Array.from(playlistMap.values());
        });
      } else {
        console.error("Failed to refresh playlists:", response.data.message);
      }
    } catch (error) {
      console.error("Error refreshing playlists:", error);
      setError("Failed to load your playlists. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh playlists when the modal opens
  useEffect(() => {
    refreshPlaylists();
  }, [isSignedIn, user]);

  // Show all playlists to allow users to add songs to any playlist, but remove duplicates
  useEffect(() => {
    if (isSignedIn && user) {
      console.log("Setting playlists for user:", user.id);
      console.log("Available playlists:", playlistsData.length);

      // Create a map to track playlists by ID to remove duplicates
      const playlistMap = new Map();

      // Process all playlists and keep only one instance of each playlist ID
      playlistsData.forEach(playlist => {
        // Skip playlists without a creator
        if (!playlist.creator) return;

        // If this playlist ID is not in our map yet, add it
        if (!playlistMap.has(playlist._id)) {
          playlistMap.set(playlist._id, playlist);
        }
      });

      // Convert the map values back to an array
      const uniquePlaylists = Array.from(playlistMap.values());

      console.log("Available playlists after removing duplicates:", uniquePlaylists.length);
      setUserPlaylists(uniquePlaylists);
    }
  }, [playlistsData, user, isSignedIn]);

  const handleAddToPlaylist = async (playlistId) => {
    if (!isSignedIn) {
      setError('You must be signed in to add songs to playlists');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await addSongToPlaylist(playlistId, songId, user.id);

      if (result.success) {
        setSuccess('Song added to playlist successfully');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError(result.message || 'Failed to add song to playlist');
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePlaylist = async () => {
    if (!newPlaylistName.trim()) {
      setError('Playlist name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Create a private playlist by default
      const result = await createPlaylist(
        {
          name: newPlaylistName,
          description: '',
          isPublic: false, // Create as private by default
          clerkId: user.id
        },
        null
      );

      if (result.success) {
        console.log("New playlist created:", result.playlist._id);

        // Add the song to the newly created playlist
        const addResult = await addSongToPlaylist(result.playlist._id, songId, user.id);

        if (addResult.success) {
          setSuccess('Song added to new playlist successfully');

          // Refresh playlists to make sure we have the latest data
          await refreshPlaylists();

          setTimeout(() => {
            onClose();
          }, 1500);
        } else {
          setError('Playlist created but failed to add song');
          // Still refresh playlists to show the new playlist
          await refreshPlaylists();
        }
      } else {
        setError(result.message || 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
      setShowCreateForm(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add to Playlist</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <p className="text-center py-4">
            You need to be signed in to add songs to playlists.
          </p>

          <div className="flex justify-end mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-white text-black font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Add to Playlist</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="bg-red-900 text-white p-2 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-900 text-white p-2 rounded mb-4">
            {success}
          </div>
        )}

        {showCreateForm ? (
          <div className="mb-4">
            <h3 className="text-lg font-semibold mb-2">Create New Playlist</h3>
            <input
              type="text"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              className="w-full bg-[#282828] p-2 rounded border border-gray-700 focus:border-white focus:outline-none mb-4"
              placeholder="Playlist name"
              disabled={isLoading}
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-3 py-1 rounded bg-transparent border border-gray-600 hover:border-white"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePlaylist}
                className="px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white font-medium"
                disabled={isLoading}
              >
                {isLoading ? 'Creating...' : 'Create & Add'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <button
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 w-full p-3 rounded bg-[#282828] hover:bg-[#333333] mb-4"
              >
                <img src={assets.plus_icon} alt="Create" className="w-5 h-5" />
                <span>Create a new playlist</span>
              </button>

              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
                  <p className="text-gray-400">Loading your playlists...</p>
                </div>
              ) : userPlaylists.length === 0 ? (
                <div className="text-center py-4">
                  <p className="text-gray-400 mb-4">
                    You don't have any playlists yet. Create one to add this song.
                  </p>
                  <button
                    onClick={refreshPlaylists}
                    className="px-4 py-2 rounded-full bg-[#333333] text-white hover:bg-[#444444] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                      </svg>
                      <span>Refresh</span>
                    </div>
                  </button>
                </div>
              ) : (
                <div className="max-h-60 overflow-y-auto">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-semibold">Available Playlists</h3>
                    <button
                      onClick={refreshPlaylists}
                      className="p-1 rounded-full hover:bg-[#333333] transition-colors"
                      title="Refresh playlists"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                        <path fillRule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                      </svg>
                    </button>
                  </div>

                  {userPlaylists.map((playlist) => (
                    <div
                      key={playlist._id}
                      className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[#333333] transition-colors ${playlist.isPublic === false ? 'private' : ''}`}
                      onClick={() => handleAddToPlaylist(playlist._id)}
                    >
                      <img
                        src={playlist.image}
                        alt={playlist.name}
                        className="w-12 h-12 object-cover rounded"
                      />
                      <div className="overflow-hidden flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-white truncate">{playlist.name}</p>
                          <div className="flex gap-1">
                            {playlist.isPublic === false && (
                              <span className="text-xs px-1 py-0.5 bg-gray-700 rounded text-gray-300">Private</span>
                            )}
                            {/* Only show "Yours" label for playlists the user owns */}
                            {((playlist.creator.clerkId && playlist.creator.clerkId === user.id) ||
                              (playlist.creator._id && playlist.creator._id === user.id)) && (
                              <span className="text-xs px-1 py-0.5 bg-green-900 rounded text-green-300">Yours</span>
                            )}
                          </div>
                        </div>
                        <p className="text-gray-400 text-xs truncate">
                          {playlist.songCount || 0} songs
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
