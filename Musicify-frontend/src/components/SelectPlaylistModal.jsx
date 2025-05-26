import React, { useContext, useState, useEffect } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import { assets } from '../assets/frontend-assets/assets';
import CreatePlaylist from './CreatePlaylist';

const SelectPlaylistModal = ({ onClose }) => {
  const { playlistsData, setPlaylistsData, currentPlaylist, loadPlaylist } = useContext(PlayerContext);
  const { user, isSignedIn } = useUser();

  const [availablePlaylists, setAvailablePlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreatePlaylistModal, setShowCreatePlaylistModal] = useState(false);

  // Load all playlists that the user can access
  useEffect(() => {
    console.log("SelectPlaylistModal: Loading playlists, total count:", playlistsData.length);

    if (isSignedIn && user) {
      console.log("SelectPlaylistModal: User is signed in with ID:", user.id);

      // Get all playlists - both public playlists and the user's own private playlists
      const filteredPlaylists = playlistsData.filter(playlist => {
        // Include if it's public OR if the user is the creator
        const isPublic = playlist.isPublic !== false; // treat undefined as public
        const isOwner = playlist.creator &&
          ((playlist.creator._id && playlist.creator._id === user.id) ||
           (playlist.creator.clerkId && playlist.creator.clerkId === user.id));

        const shouldInclude = isPublic || isOwner;
        console.log(`Playlist ${playlist.name} (${playlist._id}): Public=${isPublic}, Owner=${isOwner}, Include=${shouldInclude}`);
        return shouldInclude;
      });

      console.log("SelectPlaylistModal: Available playlists after filtering:", filteredPlaylists.length);
      setAvailablePlaylists(filteredPlaylists);
    } else {
      console.log("SelectPlaylistModal: User is not signed in, showing only public playlists");
      // If not signed in, only show public playlists
      const publicPlaylists = playlistsData.filter(playlist => playlist.isPublic !== false);
      setAvailablePlaylists(publicPlaylists);
    }
  }, [playlistsData, user, isSignedIn]);

  const handleSelectPlaylist = async (playlistId) => {
    setIsLoading(true);
    try {
      // Load the selected playlist
      const result = await loadPlaylist(playlistId, user?.id);
      if (result.success) {
        // Close the modal and navigate to the playlist
        onClose(playlistId);
      } else {
        setError(result.message || 'Failed to load playlist');
      }
    } catch (error) {
      console.error('Error selecting playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Select a Playlist</h2>
          <button
            onClick={() => onClose()}
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

        <div className="overflow-y-auto flex-1">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-semibold">Available Playlists</h3>
            <button
              onClick={() => setShowCreatePlaylistModal(true)}
              className="px-3 py-1 rounded-full bg-white text-black text-sm font-medium hover:scale-105 transition-transform flex items-center gap-1"
            >
              <span>+</span> New Playlist
            </button>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white mb-4"></div>
              <p className="text-gray-400">Loading playlists...</p>
            </div>
          ) : availablePlaylists.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-400 mb-4">
                No playlists available. Create one to continue.
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
              {availablePlaylists.map((playlist) => (
                <div
                  key={playlist._id}
                  className={`flex items-center gap-3 p-2 rounded cursor-pointer hover:bg-[#333333] transition-colors ${playlist.isPublic === false ? 'private' : ''}`}
                  onClick={() => handleSelectPlaylist(playlist._id)}
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
                        {playlist.creator &&
                          ((playlist.creator._id && playlist.creator._id === user?.id) ||
                           (playlist.creator.clerkId && playlist.creator.clerkId === user?.id)) ? (
                          <span className="text-xs px-1 py-0.5 bg-green-900 rounded text-green-300">Yours</span>
                        ) : (
                          <span className="text-xs px-1 py-0.5 bg-blue-900 rounded text-blue-300">Public</span>
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

        <div className="flex justify-end mt-4 pt-2 border-t border-gray-800">
          <button
            onClick={() => onClose()}
            className="px-4 py-2 rounded bg-transparent border border-gray-600 hover:border-white text-white"
          >
            Back
          </button>
        </div>
      </div>

      {/* Create Playlist Modal */}
      {showCreatePlaylistModal && (
        <CreatePlaylist
          onClose={() => setShowCreatePlaylistModal(false)}
          onPlaylistCreated={(newPlaylist) => {
            setShowCreatePlaylistModal(false);
            // Add the new playlist to the available playlists
            setAvailablePlaylists(prev => [...prev, newPlaylist]);
            // Automatically select the new playlist
            handleSelectPlaylist(newPlaylist._id);
          }}
        />
      )}
    </div>
  );
};

export default SelectPlaylistModal;
