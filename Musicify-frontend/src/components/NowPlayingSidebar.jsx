import React, { useContext, useRef, useEffect } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/frontend-assets/assets';

const NowPlayingSidebar = () => {
  const {
    track,
    playStatus,
    play,
    pause,
    previous,
    next,
    time,
    seekSong,
    seekBar,
    seekBg,
    hasPrevious,
    hasNext,
    setShowNowPlaying,
    registerSeekBar,
    unregisterSeekBar,
    registerSeekBg,
    unregisterSeekBg
  } = useContext(PlayerContext);

  const localSeekBarRef = useRef(null);
  const localSeekBgRef = useRef(null);

  // Register the seekbar with the context
  useEffect(() => {
    if (localSeekBarRef.current) {
      registerSeekBar(localSeekBarRef.current);
    }

    return () => {
      if (localSeekBarRef.current) {
        unregisterSeekBar(localSeekBarRef.current);
      }
    };
  }, [registerSeekBar, unregisterSeekBar]);

  // Register the seekBg with the context
  useEffect(() => {
    if (localSeekBgRef.current) {
      registerSeekBg(localSeekBgRef.current);
    }

    return () => {
      if (localSeekBgRef.current) {
        unregisterSeekBg(localSeekBgRef.current);
      }
    };
  }, [registerSeekBg, unregisterSeekBg]);

  // Close the Now Playing sidebar
  const handleClose = () => {
    setShowNowPlaying(false);
  };

  if (!track) return null;

  return (
    <div className="fixed right-0 top-0 h-full w-80 bg-[#121212] z-40 shadow-lg flex flex-col p-4 text-white">
      {/* Header with close button */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-bold">Now Playing</h1>
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <img src={assets.arrow_right} alt="Close" className="w-5 h-5" />
        </button>
      </div>

      {/* Album art and track info */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-56 h-56 mb-6">
          <img
            src={track.image}
            alt={track.name}
            className="w-full h-full object-cover shadow-lg rounded-md"
          />
        </div>

        <div className="text-center mb-6 w-full">
          <h2 className="text-xl font-bold mb-1 truncate">{track.name}</h2>
          <p className="text-gray-400 truncate">{track.artistName || track.artist}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-gray-400">
            {time.currentTime.minute}:{time.currentTime.second < 10 ? `0${time.currentTime.second}` : time.currentTime.second}
          </span>
          <span className="text-xs text-gray-400">
            {time.totalTime.minute}:{time.totalTime.second < 10 ? `0${time.totalTime.second}` : time.totalTime.second}
          </span>
        </div>
        <div
          ref={localSeekBgRef}
          onClick={seekSong}
          className="w-full h-1 bg-gray-600 rounded-full cursor-pointer"
        >
          <hr
            ref={localSeekBarRef}
            className="h-1 border-none w-0 bg-green-500 rounded-full"
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex justify-center items-center gap-6 mb-6">
        <img
          onClick={hasPrevious ? previous : undefined}
          className={`w-5 ${hasPrevious ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          src={assets.prev_icon}
          alt="Previous"
          title={hasPrevious ? "Previous song" : "No previous song"}
        />
        {playStatus
          ? <img onClick={pause} className='w-5 cursor-pointer' src={assets.pause_icon} alt="Pause" />
          : <img onClick={play} className='w-5 cursor-pointer' src={assets.play_icon} alt="Play" />}
        <img
          onClick={hasNext ? next : undefined}
          className={`w-5 ${hasNext ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          src={assets.next_icon}
          alt="Next"
          title={hasNext ? "Next song" : "No next song"}
        />
      </div>
    </div>
  );
};

export default NowPlayingSidebar;
