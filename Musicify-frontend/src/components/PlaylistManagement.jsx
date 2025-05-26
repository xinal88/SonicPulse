import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import { assets } from '../assets/frontend-assets/assets';
import axios from 'axios';

const url = 'http://localhost:4000';

const PlaylistManagement = ({ playlistId, onClose }) => {
  const { user } = useUser();
  const navigate = useNavigate();
  const {
    currentPlaylist,
    loadPlaylist,
    removeSongFromPlaylist,
    setCurrentPlaylist,
    deletePlaylist
  } = useContext(PlayerContext);

  const [songs, setSongs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [playlistDetails, setPlaylistDetails] = useState({
    name: '',
    description: '',
    image: null,
    isPublic: true
  });
  const [imagePreview, setImagePreview] = useState('');

  useEffect(() => {
    if (currentPlaylist && currentPlaylist.songs) {
      setSongs(currentPlaylist.songs);
      setPlaylistDetails({
        name: currentPlaylist.name || '',
        description: currentPlaylist.description || '',
        image: null,
        isPublic: currentPlaylist.isPublic !== false // treat undefined as true
      });
      setIsLoading(false);
    } else {
      loadPlaylistData();
    }
  }, [currentPlaylist, playlistId]);

  const loadPlaylistData = async () => {
    try {
      setIsLoading(true);
      setError('');
      const result = await loadPlaylist(playlistId, user?.id || '');
      if (result.success) {
        setSongs(result.playlist.songs || []);
        setPlaylistDetails({
          name: result.playlist.name || '',
          description: result.playlist.description || '',
          image: null,
          isPublic: result.playlist.isPublic !== false // treat undefined as true
        });
      } else {
        setError(result.message || 'Failed to load playlist');
      }
    } catch (error) {
      console.error('Error loading playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const items = Array.from(songs);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSongs(items);

    // Update the playlist in the context
    if (currentPlaylist) {
      const updatedPlaylist = {
        ...currentPlaylist,
        songs: items
      };
      setCurrentPlaylist(updatedPlaylist);
    }

    // Save the new order to the backend
    try {
      await axios.post(`${url}/api/playlist/reorder-songs`, {
        playlistId,
        songIds: items.map(song => song._id),
        clerkId: user?.id || ''
      });
    } catch (error) {
      console.error('Error saving song order:', error);
      // Revert to original order if save fails
      loadPlaylistData();
    }
  };

  const handleRemoveSong = async (songId) => {
    try {
      const result = await removeSongFromPlaylist(playlistId, songId, user?.id || '');
      if (result.success) {
        setSongs(songs.filter(song => song._id !== songId));
      }
    } catch (error) {
      console.error('Error removing song:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setPlaylistDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPlaylistDetails(prev => ({
        ...prev,
        image: file
      }));

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdatePlaylist = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData();
      formData.append('id', playlistId);
      formData.append('name', playlistDetails.name);
      formData.append('description', playlistDetails.description);
      formData.append('isPublic', playlistDetails.isPublic);
      formData.append('clerkId', user?.id || '');

      if (playlistDetails.image) {
        formData.append('image', playlistDetails.image);
      }

      const response = await axios.post(`${url}/api/playlist/update`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        // Reload playlist data
        loadPlaylistData();
        setShowEditModal(false);
      } else {
        setError(response.data.message || 'Failed to update playlist');
      }
    } catch (error) {
      console.error('Error updating playlist:', error);
      setError('An unexpected error occurred');
    }
  };

  const handleDeletePlaylist = () => {
    console.log('Deleting playlist with optimistic update:', playlistId);

    // Close the confirmation modal immediately
    setShowDeleteConfirm(false);

    // Close the management modal immediately (optimistic)
    onClose();

    // Navigate back to home immediately (optimistic) - using React Router for instant navigation
    navigate('/');

    // Fire-and-forget: Start the delete process in background without waiting
    deletePlaylist(playlistId, user?.id || '').then(result => {
      if (!result.success) {
        console.error('Delete failed:', result.message);
        // Show error notification (could add a toast notification here)
        // Note: User has already navigated away, so this is just for logging
      } else {
        console.log('Playlist deleted successfully');
      }
    }).catch(error => {
      console.error('Error deleting playlist:', error);
      // Error handling in background
    });
  };

  const handleDuplicatePlaylist = async () => {
    try {
      // Create a new playlist with the same songs
      const formData = new FormData();
      formData.append('name', `${playlistDetails.name} (Copy)`);
      formData.append('description', playlistDetails.description);
      formData.append('clerkId', user?.id || '');

      const response = await axios.post(`${url}/api/playlist/create`, formData);

      if (response.data.success) {
        const newPlaylistId = response.data.playlist._id;

        // Add all songs to the new playlist
        for (const song of songs) {
          await axios.post(`${url}/api/playlist/add-song`, {
            playlistId: newPlaylistId,
            songId: song._id,
            clerkId: user?.id || ''
          });
        }

        // Navigate to the new playlist using React Router for instant navigation
        navigate(`/playlist/${newPlaylistId}`);
      } else {
        setError(response.data.message || 'Failed to duplicate playlist');
      }
    } catch (error) {
      console.error('Error duplicating playlist:', error);
      setError('An unexpected error occurred');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <div className="text-white">
      {/* Playlist Management Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold">Manage Playlist</h2>
        </div>

        {/* Action buttons with icons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708l-3-3zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207l6.5-6.5zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.499.499 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11l.178-.178z"/>
            </svg>
            <span>Edit Details</span>
          </button>

          <button
            onClick={handleDuplicatePlaylist}
            className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M4 1.5H3a2 2 0 0 0-2 2V14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V3.5a2 2 0 0 0-2-2h-1v1h1a1 1 0 0 1 1 1V14a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1h1v-1z"/>
              <path d="M9.5 1a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-.5.5h-3a.5.5 0 0 1-.5-.5v-1a.5.5 0 0 1 .5-.5h3zm-3-1A1.5 1.5 0 0 0 5 1.5v1A1.5 1.5 0 0 0 6.5 4h3A1.5 1.5 0 0 0 11 2.5v-1A1.5 1.5 0 0 0 9.5 0h-3z"/>
            </svg>
            <span>Duplicate</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 rounded-md text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
              <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"/>
            </svg>
            <span>Delete</span>
          </button>
        </div>

        <p className="text-sm text-gray-400">Drag and drop songs to reorder them. Changes are saved automatically.</p>
      </div>

      {/* Drag and Drop Song List */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId="songs">
          {(provided) => (
            <div
              {...provided.droppableProps}
              ref={provided.innerRef}
              className="bg-[#121212] rounded-md"
            >
              {songs.map((song, index) => (
                <Draggable key={song._id} draggableId={song._id} index={index}>
                  {(provided) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className="flex items-center p-2 hover:bg-[#ffffff1a] rounded group transition-colors"
                    >
                      {/* Drag handle */}
                      <div
                        {...provided.dragHandleProps}
                        className="flex items-center justify-center w-8 cursor-grab active:cursor-grabbing"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-gray-500 group-hover:text-gray-300" viewBox="0 0 16 16">
                          <path fillRule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/>
                        </svg>
                      </div>

                      {/* Song number */}
                      <div className="flex items-center justify-center w-8">
                        <span className="text-gray-400">{index + 1}</span>
                      </div>

                      {/* Song info */}
                      <div className="flex items-center gap-3 flex-1 overflow-hidden">
                        <img
                          src={song.image}
                          alt={song.name}
                          className="w-10 h-10 object-cover rounded"
                        />
                        <div className="min-w-0">
                          <p className="truncate text-white">{song.name}</p>
                          <p className="text-sm text-gray-400 truncate">{song.artistName}</p>
                        </div>
                      </div>

                      {/* Remove button */}
                      <button
                        className="text-gray-400 hover:text-white opacity-0 group-hover:opacity-100 p-2 rounded-full hover:bg-[#ffffff1a]"
                        onClick={() => handleRemoveSong(song._id)}
                        title="Remove from playlist"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                          <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>

      {/* Edit Playlist Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#282828] p-6 rounded-lg w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Playlist</h2>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white p-1 rounded-full hover:bg-[#ffffff1a]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdatePlaylist}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  value={playlistDetails.name}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[#3e3e3e] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                  placeholder="My Awesome Playlist"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  value={playlistDetails.description}
                  onChange={handleInputChange}
                  className="w-full p-3 bg-[#3e3e3e] rounded-md text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows="3"
                  placeholder="Add an optional description"
                />
              </div>

              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPublic"
                    checked={playlistDetails.isPublic}
                    onChange={(e) => setPlaylistDetails(prev => ({...prev, isPublic: e.target.checked}))}
                    className="w-4 h-4"
                  />
                  <span>Make playlist public</span>
                </label>
                <p className="text-xs text-gray-400 mt-1 ml-6">
                  {playlistDetails.isPublic
                    ? "Public playlists can be seen by everyone and anyone can add songs."
                    : "Private playlists are only visible to you and only you can add songs."}
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Cover Image</label>
                <div className="flex items-start gap-4">
                  {(imagePreview || currentPlaylist?.image) && (
                    <img
                      src={imagePreview || currentPlaylist?.image}
                      alt="Playlist cover"
                      className="w-24 h-24 object-cover rounded-md"
                    />
                  )}
                  <div className="flex-1">
                    <label className="flex flex-col items-center px-4 py-3 bg-[#3e3e3e] rounded-md cursor-pointer hover:bg-[#4e4e4e] transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" className="mb-2" viewBox="0 0 16 16">
                        <path d="M.5 9.9a.5.5 0 0 1 .5.5v2.5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2.5a.5.5 0 0 1 1 0v2.5a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2v-2.5a.5.5 0 0 1 .5-.5z"/>
                        <path d="M7.646 1.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1-.708.708L8.5 2.707V11.5a.5.5 0 0 1-1 0V2.707L5.354 4.854a.5.5 0 1 1-.708-.708l3-3z"/>
                      </svg>
                      <span className="text-sm">Choose a file</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-400 mt-1">Recommended: Square JPG or PNG, at least 300x300px</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-md flex items-center gap-2 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"/>
                  </svg>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
          <div className="bg-[#282828] p-6 rounded-lg w-full max-w-md shadow-xl">
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
              </svg>
              <h2 className="text-xl font-bold">Delete Playlist</h2>
            </div>

            <p className="mb-6 text-gray-300">
              Are you sure you want to delete this playlist? This action <span className="font-bold">cannot be undone</span>.
            </p>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlaylist}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-md flex items-center gap-2 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z"/>
                  <path fillRule="evenodd" d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118z"/>
                </svg>
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-900 bg-opacity-50 rounded">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
};

export default PlaylistManagement;
