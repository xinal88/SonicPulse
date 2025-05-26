import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PlaylistItem = ({ playlist }) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);

  // Verify that playlist has required properties
  if (!playlist || !playlist._id || !playlist.name) {
    console.error('Invalid playlist data:', playlist);
    return null;
  }

  useEffect(() => {
    // Log playlist data for debugging
    console.log('Playlist item rendered:', playlist._id, playlist.name);
  }, [playlist]);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (playlist && playlist._id) {
      console.log(`Navigating to playlist: ${playlist._id}`);
      navigate(`/playlist/${playlist._id}`);
    } else {
      console.error('Cannot navigate to playlist: Invalid ID');
    }
  };

  // Default image in case the playlist image is missing or fails to load
  const defaultImage = 'https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg';

  return (
    <div
      className="flex items-center gap-3 p-2 hover:bg-[#1a1a1a] rounded cursor-pointer transition-colors"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label={`Open playlist: ${playlist.name}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e);
        }
      }}
    >
      <img
        src={imageError ? defaultImage : (playlist.image || defaultImage)}
        alt={playlist.name}
        className="w-10 h-10 object-cover rounded"
        onError={() => setImageError(true)}
      />
      <div className="overflow-hidden">
        <p className="text-white truncate font-medium">{playlist.name}</p>
        <p className="text-gray-400 text-xs truncate">
          Playlist • {playlist.creator?.fullName || 'Unknown'}
        </p>
      </div>
    </div>
  );
};

export default PlaylistItem;
