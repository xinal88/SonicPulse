import React, { useContext } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/frontend-assets/assets';

const QueueSidebar = () => {
  const {
    track,
    playStatus,
    play,
    pause,
    playWithId,
    songsData,
    setShowQueue
  } = useContext(PlayerContext);

  // Find the current track index
  const currentIndex = songsData.findIndex(item => item._id === track._id);

  // Close the Queue sidebar
  const handleClose = () => {
    setShowQueue(false);
  };

  // Get the upcoming songs (songs after the current one)
  const upcomingSongs = currentIndex !== -1 ? songsData.slice(currentIndex + 1) : [];

  if (!track) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-[#121212] z-40 shadow-lg flex flex-col p-4 text-white">
      {/* Header with close button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold">Queue</h1>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <img src={assets.arrow_right} alt="Close" className="w-5 h-5" />
        </button>
      </div>

      {/* Now Playing */}
      <div className="mb-6">
        <h2 className="text-sm text-gray-400 mb-3">Now Playing</h2>
        <div className="flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a]">
          <img
            src={track.image}
            alt={track.name}
            className="w-12 h-12 object-cover rounded"
          />
          <div className="flex-1 min-w-0">
            <p className="text-white truncate">{track.name}</p>
            <p className="text-gray-400 text-sm truncate">{track.artistName || track.artist}</p>
          </div>
          {playStatus
            ? <img onClick={pause} className='w-4 cursor-pointer' src={assets.pause_icon} alt="Pause" />
            : <img onClick={play} className='w-4 cursor-pointer' src={assets.play_icon} alt="Play" />}
        </div>
      </div>

      {/* Queue List */}
      <div className="flex-1 overflow-auto">
        <h2 className="text-sm text-gray-400 mb-3">Next In Queue</h2>
        {upcomingSongs.length > 0 ? (
          <div className="flex flex-col gap-2">
            {upcomingSongs.map((song, index) => (
              <div
                key={song._id}
                className="flex items-center gap-3 p-2 rounded hover:bg-[#ffffff1a] cursor-pointer"
                onClick={() => playWithId(song._id)}
              >
                <img
                  src={song.image}
                  alt={song.name}
                  className="w-12 h-12 object-cover rounded"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-white truncate">{song.name}</p>
                  <p className="text-gray-400 text-sm truncate">{song.artistName || song.artist}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-center mt-4">No more songs in queue</p>
        )}
      </div>
    </div>
  );
};

export default QueueSidebar;
