// Musicify-frontend/src/App.jsx
import React, { useContext } from 'react'
import Sidebar from './components/Sidebar'
import Player from './components/Player'
import Display from './components/Display'
import NowPlaying from './components/NowPlaying'
import NowPlayingSidebar from './components/NowPlayingSidebar'
import QueueSidebar from './components/QueueSidebar'
import { PlayerContext } from './context/PlayerContext'

const App = () => {

  const {audioRef, track, songsData, showNowPlaying, showFullscreen, showQueue} = useContext(PlayerContext);

  return (
    <div className='h-screen bg-black'>
      {
        songsData.length !== 0
          ? <>
            <div className='h-[90%] flex'>
              <Sidebar />
              <Display />
              {showNowPlaying && <NowPlayingSidebar />}
              {showQueue && <QueueSidebar />}
            </div>
            <Player />
            {showFullscreen && <NowPlaying />}
          </>
          : <div className="h-full w-full flex flex-col items-center justify-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
              <p className="text-xl">Loading Musicify...</p>
              <p className="text-gray-400 mt-2">Please make sure the backend server is running at http://localhost:4000</p>
            </div>
      }

      {/* The preload='auto' and managing src via context is correct. No loop attribute needed here. */}
      <audio ref={audioRef} src={track ? track.file:""} preload='auto'></audio>
    </div>
  )
}

export default App