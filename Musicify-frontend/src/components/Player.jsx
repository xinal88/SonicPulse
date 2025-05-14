// Musicify-frontend/src/components/Player.jsx
import React, { useContext } from 'react'
import { assets } from '../assets/frontend-assets/assets'
import { PlayerContext } from '../context/PlayerContext'

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
        LOOP_MODE,
        hasPrevious,
        hasNext,
        toggleLyrics,
        currentLyrics,
        showLyrics
    } = useContext(PlayerContext);

    // Function to get the style for the loop button based on loopMode
    const getLoopIconStyle = () => {
        switch (loopMode) {
            case LOOP_MODE.LOOP_ONE:
                return { filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(80deg)' }; // Example: Greenish tint
            case LOOP_MODE.LOOP_ALL:
                return { filter: 'brightness(0) invert(1) sepia(1) saturate(5) hue-rotate(180deg)' }; // Example: Blueish tint
            default:
                return {}; // Default style
        }
    };

    // Function to get the loop icon (could also be different icons per mode)
    const getLoopIcon = () => {
        // If you have different icons for different modes, you can switch them here.
        // For now, we'll just use the single loop_icon and change its style.
        // Example:
        // if (loopMode === LOOP_MODE.LOOP_ONE) return assets.loop_one_icon;
        // if (loopMode === LOOP_MODE.LOOP_ALL) return assets.loop_all_icon;
        return assets.loop_icon;
    }

  return track ? (
    <div className='h-[10%] bg-black flex justify-between items-center text-white px-4'>
        <div className='hidden lg:flex items-center gap-4'>
            <img className='w-12' src={track.image} alt="" />
            <div>
                <p>{track.name}</p>
                <p>{track.artist}</p>
            </div>
        </div>
        <div className='flex flex-col items-center gap-1 m-auto'>
            <div className='flex gap-4'>
                <img className='w-4 cursor-pointer' src={assets.shuffle_icon} alt="Shuffle" />
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
                <img
                    onClick={toggleLoopMode}
                    className='w-4 cursor-pointer'
                    src={getLoopIcon()}
                    style={getLoopIconStyle()}
                    alt="Loop"
                    title={
                        loopMode === LOOP_MODE.NO_LOOP ? "Loop: Off" :
                        loopMode === LOOP_MODE.LOOP_ONE ? "Loop: One" : "Loop: All"
                    }
                />
            </div>
            <div className='flex items-center gap-5'>
                <p>{time.currentTime.minute}:{time.currentTime.second}</p>
                <div ref={seekBg} onClick={seekSong} className='w-[60vw] max-w-[500px] bg-gray-300 rounded-full cursor-pointer'>
                    <hr ref={seekBar} className='h-1 border-none w-0 bg-green-800 rounded-full'/>
                </div>
                <p>{time.totalTime.minute}:{time.totalTime.second}</p>
            </div>
        </div>
        <div className='hidden lg:flex items-center gap-2 opacity-75'>
            <img className='w-4' src={assets.plays_icon} alt="" />
            <div
                onClick={toggleLyrics}
                className={`relative cursor-pointer ${currentLyrics && currentLyrics.length === 0 ? 'opacity-50' : ''}`}
                title={currentLyrics && currentLyrics.length > 0 ? "Show Lyrics" : "No lyrics available"}
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
            <img className='w-4' src={assets.queue_icon} alt="" />
            <img className='w-4' src={assets.speaker_icon} alt="" />
            <img className='w-4' src={assets.volume_icon} alt="" />
            <div className='w-20 bg-slate-50 h-1 rounded'>

            </div>
            <img className='w-4' src={assets.mini_player_icon} alt="" />
            <img className='w-4' src={assets.zoom_icon} alt="" />
        </div>
    </div>
  ) : null
}

export default Player