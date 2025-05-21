import React, { useContext, useState } from 'react';
import { assets } from '../assets/frontend-assets/assets';
import { useNavigate } from 'react-router-dom';
import { PlayerContext } from '../context/PlayerContext';
import { useUser } from '@clerk/clerk-react';
import PlaylistItem from './PlaylistItem';
import CreatePlaylist from './CreatePlaylist';

const Sidebar = () => {
  const navigate = useNavigate();
  const { playlistsData } = useContext(PlayerContext);
  const { user, isSignedIn } = useUser();
  const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);

  // Filter playlists to show user's playlists first, then other public playlists
  const userPlaylists = isSignedIn
    ? playlistsData.filter(playlist =>
        playlist.creator &&
        (playlist.creator.clerkId === user.id ||
         (playlist.creator._id && playlist.creator._id === user.id))
      )
    : [];

  const otherPlaylists = playlistsData.filter(playlist =>
    !isSignedIn ||
    (playlist.creator &&
     playlist.creator.clerkId !== user.id &&
     playlist.creator._id !== user.id)
  );

  return (
    <div className='w-[25%] h-full p-2 flex-col gap-2 text-white hidden lg:flex'>
      <div className='bg-[#121212] h-[15%] rounded flex flex-col justify-around'>
        <div onClick={()=>navigate('/')} className='flex items-center gap-3 pl-8 cursor-pointer'>
          <img className='w-6' src={assets.home_icon} alt="" />
          <p className='font-bold'>Home</p>
        </div>
        <div className='flex items-center gap-3 pl-8 cursor-pointer'>
          <img className='w-6' src={assets.search_icon} alt="" />
          <p className='font-bold'>Search</p>
        </div>
      </div>
      <div className='bg-[#121212] h-[85%] rounded flex flex-col overflow-hidden'>
        <div className='p-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <img className='w-8' src={assets.stack_icon} alt="" />
            <p>Your Library</p>
          </div>
          <div className='flex items-center gap-3'>
            <img className='w-5' src={assets.arrow_icon} alt="" />
            <img
              className='w-5 cursor-pointer'
              src={assets.plus_icon}
              alt="Create playlist"
              onClick={() => setShowCreatePlaylist(true)}
              title="Create playlist"
            />
          </div>
        </div>

        {playlistsData.length === 0 && !isSignedIn ? (
          <div className='p-4 bg-[#242424] m-2 rounded font-semibold flex flex-col items-start justify-start gap-1 pl-4'>
            <h1>Create your first playlist</h1>
            <p className='font-light'>It's easy, we will help you</p>
            <button
              className='px-4 py-1.5 bg-white text-[15px] text-black rounded-full mt-4'
              onClick={() => setShowCreatePlaylist(true)}
            >
              Create Playlist
            </button>
          </div>
        ) : (
          <div className='flex-1 overflow-y-auto px-2'>
            {/* User's playlists section */}
            {isSignedIn && userPlaylists.length > 0 && (
              <div className="mb-4">
                <h3 className="text-gray-400 text-sm font-bold px-2 mb-2">Your Playlists</h3>
                {userPlaylists.map(playlist => (
                  <PlaylistItem key={playlist._id} playlist={playlist} />
                ))}
              </div>
            )}

            {/* Other playlists section */}
            {otherPlaylists.length > 0 && (
              <div>
                <h3 className="text-gray-400 text-sm font-bold px-2 mb-2">
                  {isSignedIn ? 'Public Playlists' : 'Playlists'}
                </h3>
                {otherPlaylists.map(playlist => (
                  <PlaylistItem key={playlist._id} playlist={playlist} />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Create Playlist Modal */}
        {showCreatePlaylist && (
          <CreatePlaylist onClose={() => setShowCreatePlaylist(false)} />
        )}
      </div>
    </div>
  );
};

export default Sidebar;