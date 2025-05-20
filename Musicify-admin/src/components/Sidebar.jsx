import React from 'react'
import { assets } from '../assets/admin-assets/assets'

const Sidebar = ({ currentPath, navigateTo, activeTab, switchTab }) => {
  // Define menu items grouped by category
  const menuItems = {
    add: [
      { path: '/add-song', icon: assets.add_song, label: 'Add Song' },
      { path: '/add-album', icon: assets.add_album, label: 'Add Album' },
      { path: '/add-artist', icon: assets.add_artist, label: 'Add Artist' },
      { path: '/add-genre', icon: assets.genre_icon, label: 'Add Genre' },
    ],
    list: [
      { path: '/list-song', icon: assets.song_icon, label: 'List Song' },
      { path: '/list-album', icon: assets.album_icon, label: 'List Album' },
      { path: '/list-artist', icon: assets.artist_icon, label: 'List Artist' },
      { path: '/list-genre', icon: assets.genre_icon, label: 'List Genre' },
    ]
  };

  return (
    <div className='w-[20%] min-w-[200px] h-screen bg-black text-white p-5 flex flex-col gap-10'>
      <div className='flex items-center gap-2.5'>
        <img src={assets.logo} className='w-12' alt="" />
        <p className='text-xl font-semibold'>Musicify</p>
      </div>
      
      {/* Tab buttons */}
      <div className="flex border-b border-gray-700 mb-2">
        <button
          onClick={() => switchTab('add')}
          className={`px-4 py-2 ${
            activeTab === 'add' 
              ? 'text-green-500 border-b-2 border-green-500' 
              : 'text-white hover:text-green-400'
          }`}
        >
          Add
        </button>
        <button
          onClick={() => switchTab('list')}
          className={`px-4 py-2 ${
            activeTab === 'list' 
              ? 'text-green-500 border-b-2 border-green-500' 
              : 'text-white hover:text-green-400'
          }`}
        >
          List
        </button>
      </div>
      
      {/* Menu items for the active tab */}
      <div className='flex flex-col gap-3'>
        {menuItems[activeTab]?.map((item) => (
          <div 
            key={item.path}
            onClick={() => navigateTo(item.path)}
            className={`
              flex items-center gap-3 cursor-pointer 
              bg-white text-black font-medium
              border border-black rounded
              p-2 pl-3
              ${currentPath === item.path ? 'shadow-[0_0_5px_2px_rgba(0,128,0,0.5)]' : ''}
              hover:shadow-[0_0_5px_2px_rgba(0,128,0,0.3)]
              transition-shadow duration-200
            `}
          >
            <img src={item.icon} className='w-5 h-5' alt="" />
            <p>{item.label}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default Sidebar
