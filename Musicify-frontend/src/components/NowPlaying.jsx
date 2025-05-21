import React, { useContext, useRef, useEffect } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/frontend-assets/assets';

const NowPlaying = () => {
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
    loopMode,
    toggleLoopMode,
    LOOP_MODE,
    toggleLyrics,
    currentLyrics,
    showLyrics,
    volume,
    isMuted,
    changeVolume,
    toggleMuteHandler,
    shuffleMode,
    toggleShuffleMode,
    showFullscreen,
    setShowFullscreen,
    toggleBrowserFullscreen,
    registerSeekBar,
    unregisterSeekBar,
    registerSeekBg,
    unregisterSeekBg
  } = useContext(PlayerContext);

  const volumeBarBgRef = useRef(null);
  const localSeekBarRef = useRef(null);
  const localSeekBgRef = useRef(null);
  const displayVolumePercentage = Math.round(volume * 100);

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

  // Add event listener for fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      // If user exits fullscreen using Escape key or browser controls
      if (!document.fullscreenElement && showFullscreen) {
        setShowFullscreen(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [setShowFullscreen, showFullscreen]);

  // Handle volume change with mouse events
  const handleMouseDownVolume = (e) => {
    updateVolume(e);
    document.addEventListener('mousemove', updateVolume);
    document.addEventListener('mouseup', stopVolumeUpdate);
  };

  const updateVolume = (e) => {
    if (volumeBarBgRef.current) {
      const rect = volumeBarBgRef.current.getBoundingClientRect();
      const width = rect.width;
      const x = e.clientX - rect.left;
      const percentage = Math.max(0, Math.min(1, x / width));
      changeVolume(percentage);
    }
  };

  const stopVolumeUpdate = () => {
    document.removeEventListener('mousemove', updateVolume);
    document.removeEventListener('mouseup', stopVolumeUpdate);
  };

  // Determine which loop icon to display based on the current loopMode
  const getLoopIcon = () => {
    switch (loopMode) {
      case LOOP_MODE.LOOP_ONE:
        return assets.loop1_icon || assets.loop_icon;
      case LOOP_MODE.LOOP_ALL:
        return assets.loopall_icon;
      case LOOP_MODE.NO_LOOP:
      default:
        return assets.loop_icon;
    }
  };

  // Get style for loop icon based on mode
  const getLoopIconStyle = () => {
    return {
      filter: loopMode === LOOP_MODE.NO_LOOP ? 'grayscale(100%)' : 'none',
      opacity: loopMode === LOOP_MODE.NO_LOOP ? 0.5 : 1
    };
  };

  // Get style for shuffle icon based on mode
  const getShuffleIconStyle = () => {
    return {
      filter: !shuffleMode ? 'grayscale(100%)' : 'none',
      opacity: !shuffleMode ? 0.5 : 1
    };
  };

  // Close the Fullscreen view and exit browser fullscreen
  const handleClose = () => {
    setShowFullscreen(false);

    // Exit browser fullscreen if active
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => {
        console.error(`Error attempting to exit fullscreen: ${err.message}`);
      });
    }
  };

  if (!track) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-gray-900 to-black z-50 flex flex-col p-6 text-white">
      {/* Header with close button */}
      <div className="flex justify-between items-center mb-8">
        <button
          onClick={handleClose}
          className="text-white hover:text-gray-300 transition-colors"
        >
          <img src={assets.arrow_icon} alt="Close" className="w-6 h-6 transform rotate-90" />
        </button>
        <h1 className="text-xl font-bold">Now Playing</h1>
        <div className="w-6"></div> {/* Empty div for balance */}
      </div>

      {/* Album art and track info */}
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className="w-64 h-64 md:w-80 md:h-80 mb-8 relative">
          <img
            src={track.image}
            alt={track.name}
            className="w-full h-full object-cover shadow-2xl rounded-md"
          />
        </div>

        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-1">{track.name}</h2>
          <p className="text-gray-400">{track.artistName || track.artist}</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            {time.currentTime.minute}:{time.currentTime.second < 10 ? `0${time.currentTime.second}` : time.currentTime.second}
          </span>
          <span className="text-sm text-gray-400">
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
      <div className="flex justify-center items-center gap-8 mb-8">
        <img
          onClick={toggleShuffleMode}
          className="w-5 cursor-pointer"
          src={assets.shuffle_icon}
          style={getShuffleIconStyle()}
          alt="Shuffle"
          title={shuffleMode ? "Shuffle: On" : "Shuffle: Off"}
        />
        <img
          onClick={hasPrevious ? previous : undefined}
          className={`w-6 ${hasPrevious ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          src={assets.prev_icon}
          alt="Previous"
          title={hasPrevious ? "Previous song" : "No previous song"}
        />
        {playStatus
          ? <img onClick={pause} className='w-6 cursor-pointer' src={assets.pause_icon} alt="Pause" />
          : <img onClick={play} className='w-6 cursor-pointer' src={assets.play_icon} alt="Play" />}
        <img
          onClick={hasNext ? next : undefined}
          className={`w-6 ${hasNext ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
          src={assets.next_icon}
          alt="Next"
          title={hasNext ? "Next song" : "No next song"}
        />
        <img
          onClick={toggleLoopMode}
          className="w-5 cursor-pointer"
          src={getLoopIcon()}
          style={getLoopIconStyle()}
          alt="Loop"
          title={
            loopMode === LOOP_MODE.NO_LOOP
              ? "Enable repeat"
              : loopMode === LOOP_MODE.LOOP_ALL
                ? "Enable repeat one"
                : "Disable repeat"
          }
        />
      </div>

      {/* Volume control */}
      <div className="flex items-center justify-center gap-4 mb-4">
        <img
          onClick={toggleMuteHandler}
          className="w-5 cursor-pointer"
          src={isMuted ? assets.mute_icon : assets.volume_icon}
          alt={isMuted ? "Unmute" : "Mute"}
          title={isMuted ? "Unmute" : "Mute"}
        />
        <div
          ref={volumeBarBgRef}
          onMouseDown={handleMouseDownVolume}
          className="w-32 h-1 bg-gray-600 rounded-full cursor-pointer relative group flex items-center"
          title={`Volume: ${Math.round(volume * 100)}%`}
        >
          <div
            className="h-1 bg-green-500 rounded-l-full pointer-events-none"
            style={{ width: `${displayVolumePercentage}%`, ...(displayVolumePercentage === 100 && { borderRadius: '9999px' }) }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity"
            style={{ left: `calc(${displayVolumePercentage}% - 6px)` }}
          />
        </div>
      </div>
    </div>
  );
};

export default NowPlaying;
