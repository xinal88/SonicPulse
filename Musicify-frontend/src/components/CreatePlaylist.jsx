import React, { useState, useContext } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import { assets } from '../assets/frontend-assets/assets';

const CreatePlaylist = ({ onClose, onPlaylistCreated }) => {
  const { createPlaylist } = useContext(PlayerContext);
  const { user } = useUser();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Playlist name is required');
      return;
    }

    if (!user) {
      setError('You must be logged in to create a playlist');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      console.log('Creating playlist:', name, 'isPublic:', isPublic);

      const result = await createPlaylist(
        {
          name,
          description,
          isPublic,
          clerkId: user.id
        },
        imageFile
      );

      if (result.success) {
        console.log('Playlist created successfully:', result.playlist);

        // Add a small delay to ensure the backend has time to process
        setTimeout(() => {
          // Call the onPlaylistCreated callback if provided
          if (onPlaylistCreated) {
            onPlaylistCreated(result.playlist);
          } else {
            // If no callback is provided, just close the modal
            onClose();
          }
        }, 500);
      } else {
        console.error('Failed to create playlist:', result.message);
        setError(result.message || 'Failed to create playlist');
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      setError('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50">
      <div className="bg-[#121212] text-white p-6 rounded-lg w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Playlist</h2>
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

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2">
              Playlist Image
            </label>
            <div className="flex items-center gap-4">
              <div
                className="w-24 h-24 bg-[#282828] rounded flex items-center justify-center overflow-hidden"
                style={{ backgroundImage: imagePreview ? `url(${imagePreview})` : 'none', backgroundSize: 'cover' }}
              >
                {!imagePreview && (
                  <label className="cursor-pointer w-full h-full flex items-center justify-center">
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                    />
                    <img src={assets.plus_icon} alt="Add" className="w-8 h-8 opacity-50" />
                  </label>
                )}
              </div>
              {imagePreview && (
                <button
                  type="button"
                  onClick={() => {
                    setImageFile(null);
                    setImagePreview(null);
                  }}
                  className="text-sm text-gray-400 hover:text-white"
                >
                  Remove
                </button>
              )}
            </div>
          </div>

          <div className="mb-4">
            <label className="block mb-2">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#282828] p-2 rounded border border-gray-700 focus:border-white focus:outline-none"
              placeholder="My Playlist"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#282828] p-2 rounded border border-gray-700 focus:border-white focus:outline-none"
              placeholder="Add an optional description"
              rows="3"
            />
          </div>

          <div className="mb-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isPublic}
                onChange={(e) => setIsPublic(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Make playlist public</span>
            </label>
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-transparent border border-gray-600 hover:border-white"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-green-500 hover:bg-green-600 text-white font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePlaylist;
