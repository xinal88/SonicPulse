// Musicify-frontend/src/components/Player.jsx
import React, { useContext, useRef, useState, useEffect, useCallback } from 'react';
import { assets } from '../assets/frontend-assets/assets'; // Ensure assets.loop_icon, assets.loop1_icon, assets.loopall_icon are available
import { PlayerContext } from '../context/PlayerContext';

const Player = () => {
    const {
        seekSong,
        time,
        track,
        seekBar,
        seekBg,
        playStatus,
        play,
        pause,
        previous,
        next,
        loopMode,
        toggleLoopMode,
        LOOP_MODE, // Make sure LOOP_MODE is correctly imported/destructured
        hasPrevious,
        hasNext,
        toggleLyrics,
        currentLyrics,
        showLyrics,
        volume,
        isMuted,
        changeVolume,
        toggleMuteHandler,
        shuffleMode,
        toggleShuffleMode,
        showNowPlaying,
        setShowNowPlaying,
        showFullscreen,
        setShowFullscreen,
        isFullscreenMode,
        toggleBrowserFullscreen,
        showQueue,
        toggleQueue,
        registerSeekBar,
        unregisterSeekBar,
        registerSeekBg,
        unregisterSeekBg
    } = useContext(PlayerContext);

    const volumeBarBgRef = useRef(null);
    const localSeekBarRef = useRef(null);
    const localSeekBgRef = useRef(null);
    const [isDraggingVolume, setIsDraggingVolume] = useState(false);

    const calculateVolumeFromEvent = useCallback((event, barRef) => {
        if (!barRef.current) return volume;
        const rect = barRef.current.getBoundingClientRect();
        let relativeX = event.clientX - rect.left;
        let newVolume = relativeX / rect.width;
        newVolume = Math.max(0, Math.min(1, newVolume));
        return newVolume;
    }, [volume]);

    const handleVolumeInteraction = useCallback((event) => {
        const newVolume = calculateVolumeFromEvent(event, volumeBarBgRef);
        if (newVolume !== volume || (newVolume === 0 && isMuted)) {
            changeVolume(newVolume);
        }
    }, [calculateVolumeFromEvent, changeVolume, volumeBarBgRef, volume, isMuted]);

    const handleMouseDownVolume = useCallback((event) => {
        setIsDraggingVolume(true);
        handleVolumeInteraction(event);
    }, [handleVolumeInteraction]);

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

    useEffect(() => {
        const handleMouseMove = (event) => {
            if (isDraggingVolume) {
                handleVolumeInteraction(event);
            }
        };
        const handleMouseUp = () => {
            if (isDraggingVolume) {
                setIsDraggingVolume(false);
            }
        };
        if (isDraggingVolume) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDraggingVolume, handleVolumeInteraction]);

    // Determine which loop icon to display based on the current loopMode
    const getLoopIcon = () => {
        switch (loopMode) {
            case LOOP_MODE.LOOP_ONE:
                return assets.loop1_icon || assets.loop_icon; // Fallback to default if loop1_icon is not found
            case LOOP_MODE.LOOP_ALL:
                return assets.loopall_icon; // Fallback to default if loopall_icon is not found
            case LOOP_MODE.NO_LOOP:
            default:
                return assets.loop_icon; // Default icon for no loop
        }
    };

    // Optional: Adjust styling if new icons have their own active/inactive states
    // If your new icons are already colored or styled for active states, you might not need these dynamic styles.
    const getLoopIconStyle = () => {
        switch (loopMode) {
            case LOOP_MODE.LOOP_ONE:
                // Example: if loop1_icon is already green, you might return {}
                return {}; // Greenish tint
            case LOOP_MODE.LOOP_ALL:
                // Example: if loopall_icon is already blue, you might return {}
                return {}; // Bluish tint
            default: // LOOP_MODE.NO_LOOP
                return { }; // Default style (no filter or specific style for inactive)
        }
    };

    const displayVolumePercentage = (isMuted ? 0 : volume) * 100;

    // This will apply green color to the shuffle icon when active
    const getShuffleIconStyle = () => {
        return shuffleMode ? { filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%)' } : {};
    };

    // Toggle the Now Playing view
    const toggleNowPlaying = () => {
        setShowNowPlaying(prev => !prev);
    };

    // Toggle the Fullscreen view and browser fullscreen
    const toggleFullscreen = () => {
        // Toggle our app's fullscreen view
        setShowFullscreen(prev => !prev);

        // Toggle browser fullscreen mode
        toggleBrowserFullscreen();
    };

    return track ? (
        <div className='h-[10%] bg-black flex justify-between items-center text-white px-4'>
            <div className='hidden lg:flex items-center gap-4'>
                <img className='w-12' src={track.image} alt="" />
                <div>
                    <p className='truncate w-32 xl:w-48'>{track.name}</p>
                    <p className='truncate w-32 xl:w-48 text-xs text-gray-400'>{track.artistName || track.artist}</p>
                </div>
            </div>
            <div className='flex flex-col items-center gap-1 m-auto'>
                <div className='flex gap-4'>
                    <img
                        onClick={toggleShuffleMode}
                        className='w-4 cursor-pointer'
                        src={assets.shuffle_icon}
                        style={getShuffleIconStyle()}
                        alt="Shuffle"
                        title={shuffleMode ? "Shuffle: On" : "Shuffle: Off"}
                    />
                    <img
                        onClick={hasPrevious ? previous : undefined}
                        className={`w-4 ${hasPrevious ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        src={assets.prev_icon}
                        alt="Previous"
                        title={hasPrevious ? "Previous song" : "No previous song"}
                    />
                    {playStatus
                        ? <img onClick={pause} className='w-4 cursor-pointer' src={assets.pause_icon} alt="Pause" />
                        : <img onClick={play} className='w-4 cursor-pointer' src={assets.play_icon} alt="Play" />}
                    <img
                        onClick={hasNext ? next : undefined}
                        className={`w-4 ${hasNext ? 'cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
                        src={assets.next_icon}
                        alt="Next"
                        title={hasNext ? "Next song" : "No next song"}
                    />
                    {/* Updated Loop Icon */}
                    <img
                        onClick={toggleLoopMode}
                        className='w-4 cursor-pointer'
                        src={getLoopIcon()}
                        style={getLoopIconStyle()}
                        alt="Loop"
                        title={
                            loopMode === LOOP_MODE.NO_LOOP ? "Loop: Off" :
                                loopMode === LOOP_MODE.LOOP_ONE ? "Loop: Repeat One" : "Loop: Repeat All"
                        }
                    />
                </div>
                <div className='flex items-center gap-5'>
                    <p className='text-xs w-8 text-center'>{time.currentTime.minute}:{time.currentTime.second < 10 ? `0${time.currentTime.second}` : time.currentTime.second}</p>
                    <div ref={localSeekBgRef} onClick={seekSong} className='w-[50vw] md:w-[60vw] max-w-[500px] bg-gray-300 rounded-full cursor-pointer'>
                        <hr ref={localSeekBarRef} className='h-1 border-none w-0 bg-green-800 rounded-full' />
                    </div>
                    <p className='text-xs w-8 text-center'>{time.totalTime.minute}:{time.totalTime.second < 10 ? `0${time.totalTime.second}` : time.totalTime.second}</p>
                </div>
            </div>
            <div className='hidden lg:flex items-center gap-3 opacity-75'>

                <div
                    onClick={toggleLyrics}
                    className={`relative cursor-pointer ${currentLyrics && currentLyrics.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={currentLyrics && currentLyrics.length > 0 ? (showLyrics ? "Hide Lyrics" : "Show Lyrics") : "No lyrics available"}
                >
                    <img
                        className="w-4"
                        src={assets.mic_icon}
                        alt="Lyrics"
                    />
                    {currentLyrics && currentLyrics.length > 0 && (
                        <div className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${showLyrics ? 'bg-green-500' : 'bg-white'}`}></div>
                    )}
                </div>
                <img
                    onClick={toggleQueue}
                    className='w-4 cursor-pointer'
                    src={assets.queue_icon}
                    alt="Queue"
                    title={showQueue ? "Hide Queue" : "Show Queue"}
                    style={showQueue ? { filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%)' } : {}}
                />
                <img
                    onClick={toggleMuteHandler}
                    className='w-4 cursor-pointer'
                    src={isMuted ? (assets.mute_icon) : assets.volume_icon}
                    alt={isMuted ? "Unmute" : "Mute"}
                    title={isMuted ? "Unmute" : "Mute"}
                />
                <div
                    ref={volumeBarBgRef}
                    onMouseDown={handleMouseDownVolume}
                    className='w-24 h-1 bg-slate-300 rounded-full cursor-pointer relative group flex items-center'
                    title={`Volume: ${Math.round(volume * 100)}%`}
                >
                    <div
                        className='h-1 bg-green-500 rounded-l-full pointer-events-none'
                        style={{ width: `${displayVolumePercentage}%`, ...(displayVolumePercentage === 100 && { borderRadius: '9999px' }) }}
                    />
                    <div
                        className='absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow pointer-events-none opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity'
                        style={{ left: `calc(${displayVolumePercentage}% - 6px)` }}
                    />
                </div>
                <img
                    onClick={toggleNowPlaying}
                    className='w-4 cursor-pointer'
                    src={assets.plays_icon}
                    alt="Now Playing"
                    title={showNowPlaying ? "Hide Now Playing" : "Show Now Playing"}
                    style={showNowPlaying ? { filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%)' } : {}}
                />
                <img
                    onClick={toggleFullscreen}
                    className='w-4 cursor-pointer'
                    src={assets.zoom_icon}
                    alt="Fullscreen"
                    title={showFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
                    style={showFullscreen ? { filter: 'invert(48%) sepia(79%) saturate(2476%) hue-rotate(86deg) brightness(90%) contrast(95%)' } : {}}
                />
            </div>
        </div>
    ) : null;
};

export default Player;
