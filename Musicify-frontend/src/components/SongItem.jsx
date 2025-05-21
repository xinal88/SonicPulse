import React, { useContext, useState } from 'react';
import { PlayerContext } from '../context/PlayerContext';
import { assets } from '../assets/frontend-assets/assets';
import AddToPlaylistModal from './AddToPlaylistModal';

const SongItem = ({name, image, artist, id}) => {
    const { playWithId } = useContext(PlayerContext);
    const [showOptions, setShowOptions] = useState(false);
    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);

    const handleClick = () => {
        playWithId(id);
    };

    const handleAddToPlaylist = (e) => {
        e.stopPropagation();
        setShowAddToPlaylist(true);
    };

    return (
        <div
            className='min-w-[180px] w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26] relative'
            onClick={handleClick}
            onMouseEnter={() => setShowOptions(true)}
            onMouseLeave={() => setShowOptions(false)}
        >
            <div className='w-full h-[180px] overflow-hidden relative'>
                <img className='rounded w-full h-full object-cover' src={image} alt="" />

                {showOptions && (
                    <div className="absolute bottom-2 right-2 flex gap-2">
                        <button
                            className="w-8 h-8 rounded-full bg-black bg-opacity-70 flex items-center justify-center hover:bg-opacity-90"
                            onClick={handleAddToPlaylist}
                            title="Add to playlist"
                        >
                            <img src={assets.plus_icon} alt="Add to playlist" className="w-4 h-4" />
                        </button>
                    </div>
                )}
            </div>
            <p className='font-bold mt-2 mb-1 truncate'>{name}</p>
            <p className='text-slate-200 text-sm truncate'>{artist}</p>

            {showAddToPlaylist && (
                <AddToPlaylistModal
                    songId={id}
                    onClose={() => setShowAddToPlaylist(false)}
                />
            )}
        </div>
    );
};

export default SongItem;