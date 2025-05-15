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
          : null
      }

      {/* The preload='auto' and managing src via context is correct. No loop attribute needed here. */}
      <audio ref={audioRef} src={track ? track.file:""} preload='auto'></audio>
    </div>
  )
}

export default App