import React, { useContext, useState, useEffect } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import CreatePlaylist from './CreatePlaylist';
import { assets } from '../assets/frontend-assets/assets';
import axios from 'axios';

const SearchSongsModal = ({ playlistId, onClose, onSongAdded }) => {
  const { addSongToPlaylist, songsData, currentPlaylist, playlistsData } = useContext(PlayerContext);
  const { user, isSignedIn } = useUser();

  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedSong, setSelectedSong] = useState(null);
  const [showUserPlaylists, setShowUserPlaylists] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);

  // Get songs that are not already in the playlist
  useEffect(() => {
    if (!searchTerm) {
      // If no search term, show all songs not in the playlist
      const playlistSongIds = currentPlaylist?.songs?.map(song => song._id) || [];
      const filteredSongs = songsData.filter(song => !playlistSongIds.includes(song._id));
      setSearchResults(filteredSongs.slice(0, 10)); // Limit to 10 songs initially
    }
  }, [songsData, currentPlaylist, searchTerm]);

  // Load all playlists
  useEffect(() => {
    if (isSignedIn && user) {
      console.log("Loading playlists for user ID:", user.id);
      console.log("Available playlists:", playlistsData.length);

      // Get all playlists - both public playlists and the user's own private playlists
      const availablePlaylists = playlistsData.filter(playlist => {
        // Include if it's public OR if the user is the creator
        const isPublic = playlist.isPublic !== false; // treat undefined as public
        const isOwner = playlist.creator &&
          ((playlist.creator._id && playlist.creator._id === user.id) ||
           (playlist.creator.clerkId && playlist.creator.clerkId === user.id));

        return isPublic || isOwner;
      });

      console.log("Available playlists after filtering:", availablePlaylists.length);

      // Include the current playlist if we're viewing one and it's not already included
      if (currentPlaylist && currentPlaylist._id) {
        const isCurrentPlaylistIncluded = availablePlaylists.some(p => p._id === currentPlaylist._id);

        if (!isCurrentPlaylistIncluded) {
          // Check if the current playlist is public or owned by the user
          const isPublic = currentPlaylist.isPublic !== false;
          const isOwner = currentPlaylist.creator &&
            ((currentPlaylist.creator._id && currentPlaylist.creator._id === user.id) ||
             (currentPlaylist.creator.clerkId && currentPlaylist.creator.clerkId === user.id));

          if (isPublic || isOwner) {
            availablePlaylists.push(currentPlaylist);
            console.log("Added current playlist to available playlists");
          }
        }
      }

      console.log("Total playlists available:", availablePlaylists.length);
      setUserPlaylists(availablePlaylists);
    }
  }, [playlistsData, user, isSignedIn, currentPlaylist]);

  const handleSearch = async (e) => {
    e?.preventDefault();

    if (!searchTerm.trim()) {
      // If search is cleared, show initial results
      const playlistSongIds = currentPlaylist?.songs?.map(song => song._id) || [];
      const filteredSongs = songsData.filter(song => !playlistSongIds.includes(song._id));
      setSearchResults(filteredSongs.slice(0, 10));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Filter songs locally based on search term
      const playlistSongIds = currentPlaylist?.songs?.map(song => song._id) || [];
      const filteredSongs = songsData.filter(song => {
        // Don't include songs already in the playlist
        if (playlistSongIds.includes(song._id)) return false;

        // Search by song name, artist name, or album
        const songName = song.name.toLowerCase();
        const artistName = (song.artistName || song.artist || '').toLowerCase();
        const album = (song.album || '').toLowerCase();
        const term = searchTerm.toLowerCase();

        return songName.includes(term) || artistName.includes(term) || album.includes(term);
      });

      setSearchResults(filteredSongs);
    } catch (error) {
      console.error('Error searching songs:', error);
      setError('An error occurred while searching for songs');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddSong = async (songId) => {
    if (!isSignedIn) {
      setError('You must be signed in to add songs to playlists');
      return;
    }

    // Check if the user is the owner of the current playlist
    const isOwner = currentPlaylist?.creator &&
      (currentPlaylist.creator._id === user.id ||
       (currentPlaylist.creator.clerkId && currentPlaylist.creator.clerkId === user.id));

    if (isOwner) {
      // If user is the owner, add the song directly to the current playlist
      await addSongToCurrentPlaylist(songId);
    } else {
      // If user is not the owner, show their playlists to choose from
      const song = songsData.find(s => s._id === songId);
      setSelectedSong(song);
      setShowUserPlaylists(true);

      // If there are no playlists available, show a helpful message
      if (userPlaylists.length === 0) {
        setError('No playlists available. Create a new playlist to add this song.');
      }
    }
  };

  const addSongToCurrentPlaylist = async (songId) => {
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const result = await addSongToPlaylist(playlistId, songId, user.id);

      if (result.success) {
        setSuccess('Song added to playlist successfully');

        // Remove the added song from search results
        setSearchResults(prev => prev.filter(song => song._id !== songId));

        // Notify parent component
        if (onSongAdded) {
          onSongAdded(songId);
        }
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

  const handleAddToUserPlaylist = async (userPlaylistId) => {
    if (!selectedSong) return;

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      // Find the playlist
      const playlist = userPlaylists.find(p => p._id === userPlaylistId);

      if (!playlist) {
        setError('Playlist not found');
        setIsLoading(false);
        return;
      }

      // Check if the user is the owner of the playlist
      const isOwner = playlist.creator &&
        ((playlist.creator._id && playlist.creator._id === user.id) ||
         (playlist.creator.clerkId && playlist.creator.clerkId === user.id));

      // Check if the playlist is private
      const isPrivate = playlist.isPublic === false;

      // If the playlist is private and the user is not the owner, don't allow adding songs
      if (isPrivate && !isOwner) {
        setError('You cannot add songs to private playlists you don\'t own');
        setIsLoading(false);
        return;
      }

      // Log detailed information for debugging
      console.log(`Adding song to playlist: ${playlist.name} (${playlist._id})`);
      console.log(`Playlist privacy: isPublic = ${isPrivate ? 'false (Private)' : 'true (Public)'}`);
      console.log(`User is owner: ${isOwner}`);
      console.log(`User ID: ${user.id}`);
      console.log(`Song ID: ${selectedSong._id}`);

      // Call the API to add the song to the playlist
      const result = await addSongToPlaylist(userPlaylistId, selectedSong._id, user.id);

      if (result.success) {
        setSuccess(`Song added to "${playlist.name}" successfully`);

        // Add a small delay to show the success message before closing
        setTimeout(() => {
          setShowUserPlaylists(false);
          setSelectedSong(null);

          // If there's a callback for when a song is added, call it
          if (onSongAdded) {
            onSongAdded(selectedSong._id);
          }
        }, 1000);
      } else {
        console.error('Failed to add song:', result.message);

        // Provide more specific error messages based on the backend response
        if (result.message && result.message.includes("permission")) {
          setError('You don\'t have permission to modify this playlist');
        } else if (result.message && result.message.includes("private")) {
          setError('You cannot add songs to private playlists you don\'t own');
        } else if (result.message && result.message.includes("already in")) {
          setError('This song is already in the playlist');
        } else {
          setError(result.message || 'Failed to add song to playlist');
        }
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isSignedIn) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
        <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Add Songs to Playlist</h2>
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
      <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">
            {showUserPlaylists ? 'Select a Playlist' : 'Add Songs to Playlist'}
          </h2>
          <button
            onClick={() => {
              if (showUserPlaylists) {
                setShowUserPlaylists(false);
                setSelectedSong(null);
              } else {
                onClose();
              }
            }}
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

        {showUserPlaylists ? (
          // Show user's playlists to select from
          <div className="overflow-y-auto flex-1">
            {selectedSong && (
              <div className="mb-4 p-3 bg-[#282828] rounded flex items-center gap-3">
                <img
                  src={selectedSong.image}
                  alt={selectedSong.name}
                  className="w-12 h-12 object-cover"
                />
                <div>
                  <p className="text-white font-medium">{selectedSong.name}</p>
                  <p className="text-gray-400 text-sm">
                    {selectedSong.artistName || selectedSong.artist} • {selectedSong.album}
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Available Playlists</h3>
              <button
                onClick={() => setShowCreatePlaylistModal(true)}
                className="px-3 py-1 rounded-full bg-white text-black text-sm font-medium hover:scale-105 transition-transform flex items-center gap-1"
              >
                <span>+</span> New Playlist
              </button>
            </div>

            {userPlaylists.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-gray-400 mb-4">
                  No playlists available. Create one to add this song.
                </p>
                <button
                  onClick={() => setShowCreatePlaylistModal(true)}
                  className="px-4 py-2 rounded-full bg-white text-black font-medium hover:scale-105 transition-transform"
                >
                  Create Playlist
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {userPlaylists.map((playlist) => (
                  <div
                    key={playlist._id}
                    className={`flex items-center gap-3 p-2 rounded cursor-pointer playlist-item ${playlist.isPublic === false ? 'private' : ''}`}
                    onClick={() => handleAddToUserPlaylist(playlist._id)}
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
                            <span className="playlist-badge private">Private</span>
                          )}
                          {playlist.creator &&
                            ((playlist.creator._id && playlist.creator._id === user.id) ||
                             (playlist.creator.clerkId && playlist.creator.clerkId === user.id)) ? (
                            <span className="playlist-badge yours">Yours</span>
                          ) : (
                            <span className="playlist-badge public">Public</span>
                          )}
                        </div>
                      </div>
                      <p className="text-gray-400 text-xs truncate">
                        {playlist.songs?.length || 0} songs • {playlist.creator?.fullName || 'Unknown'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Show songs search and results
          <>
            <form onSubmit={handleSearch} className="mb-4 flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1 bg-[#282828] p-2 rounded border border-gray-700 focus:border-white focus:outline-none"
                placeholder="Search for songs by name, artist, or album"
                disabled={isLoading}
              />
              <button
                type="submit"
                className="px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white font-medium"
                disabled={isLoading}
              >
                Search
              </button>
            </form>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="flex justify-center items-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
                </div>
              ) : searchResults.length === 0 ? (
                <p className="text-gray-400 text-center py-8">
                  {searchTerm ? 'No songs found matching your search' : 'No songs available to add'}
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-2">
                  {searchResults.map((song) => (
                    <div
                      key={song._id}
                      className="flex items-center gap-3 p-2 hover:bg-[#282828] rounded group"
                    >
                      <img
                        src={song.image}
                        alt={song.name}
                        className="w-12 h-12 object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{song.name}</p>
                        <p className="text-gray-400 text-sm truncate">
                          {song.artistName || song.artist} • {song.album}
                        </p>
                      </div>
                      <button
                        onClick={() => handleAddSong(song._id)}
                        className="px-3 py-1 rounded bg-green-500 hover:bg-green-600 text-white text-sm"
                        disabled={isLoading}
                      >
                        Add
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex justify-end mt-4 pt-2 border-t border-gray-800">
          <button
            onClick={() => {
              if (showUserPlaylists) {
                setShowUserPlaylists(false);
                setSelectedSong(null);
              } else {
                onClose();
              }
            }}
            className="px-4 py-2 rounded bg-transparent border border-gray-600 hover:border-white text-white"
          >
            {showUserPlaylists ? 'Back' : 'Close'}
          </button>
        </div>
      </div>

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <CreatePlaylist
          onClose={() => setShowCreatePlaylistModal(false)}
          onPlaylistCreated={(newPlaylist) => {
            setShowCreatePlaylistModal(false);
            // Add the new playlist to the user's playlists
            setUserPlaylists(prev => [...prev, newPlaylist]);
            // If we have a selected song, automatically add it to the new playlist
            if (selectedSong) {
              handleAddToUserPlaylist(newPlaylist._id);
            }
          }}
        />
      )}
    </div>
  );
};

export default SearchSongsModal;
