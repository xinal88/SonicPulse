import React, { useContext, useState } from 'react'
import { PlayerContext } from '../context/PlayerContext'
import { assets } from '../assets/frontend-assets/assets'
import AddToPlaylistModal from './AddToPlaylistModal'

const SongItem = ({name, image, artist, id}) => { // Changed from desc to artist

    const {playWithId} = useContext(PlayerContext)
    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false)

    const handlePlayClick = (e) => {
        e.stopPropagation()
        playWithId(id)
    }

    const handleAddToPlaylistClick = (e) => {
        e.stopPropagation()
        setShowAddToPlaylist(true)
    }

  return (
    <>
        <div className='min-w-[180px] w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26] relative group'>
            <div className='w-full h-[180px] overflow-hidden relative'>
                <img className='rounded w-full h-full object-cover' src={image} alt="" />

                {/* Play button - appears on hover */}
                <div className='absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center rounded'>
                    <button
                        onClick={handlePlayClick}
                        className='w-12 h-12 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-400 transition-colors mr-2'
                    >
                        <img src={assets.play_icon} alt="Play" className="w-6 h-6" />
                    </button>

                    {/* Add to playlist button */}
                    <button
                        onClick={handleAddToPlaylistClick}
                        className='w-10 h-10 bg-[#282828] rounded-full flex items-center justify-center hover:bg-[#3e3e3e] transition-colors'
                        title="Add to playlist"
                    >
                        <img src={assets.plus_icon} alt="Add to playlist" className="w-5 h-5" />
                    </button>
                </div>
            </div>
            <p className='font-bold mt-2 mb-1 truncate'>{name}</p>
            <p className='text-slate-200 text-sm truncate'>{artist}</p> {/* Changed from desc to artist */}
        </div>

        {/* Add to Playlist Modal */}
        {showAddToPlaylist && (
            <AddToPlaylistModal
                songId={id}
                onClose={() => setShowAddToPlaylist(false)}
            />
        )}
    </>
  )
}

export default SongItem