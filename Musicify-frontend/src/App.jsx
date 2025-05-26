// Musicify-frontend/src/App.jsx
import { useContext, useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { PlayerContext } from './context/PlayerContext';
import Sidebar from './components/Sidebar';
import Display from './components/Display';
import Player from './components/Player';
import NowPlaying from './components/NowPlaying';
import NowPlayingSidebar from './components/NowPlayingSidebar';
import QueueSidebar from './components/QueueSidebar';
import SelectPlaylistModal from './components/SelectPlaylistModal';
import ErrorBoundary from './components/ErrorBoundary';
import Search from './components/Search';

const App = () => {
  const {audioRef, track, songsData, showNowPlaying, showFullscreen, showQueue, showSelectPlaylist, setShowSelectPlaylist} = useContext(PlayerContext);
  const [clerkDisabled, setClerkDisabled] = useState(false);
  const navigate = useNavigate();

  // Check if Clerk should be disabled (for troubleshooting)
  useEffect(() => {
    const disableClerk = localStorage.getItem('disableClerk') === 'true';
    setClerkDisabled(disableClerk);

    // Add keyboard shortcut to toggle Clerk (Ctrl+Shift+C)
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        const newValue = !clerkDisabled;
        localStorage.setItem('disableClerk', newValue);
        setClerkDisabled(newValue);
        window.location.reload();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [clerkDisabled]);



  return (
    <div className='h-screen bg-black'>
      {clerkDisabled && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-600 text-white text-center py-1 text-sm z-50">
          Clerk authentication disabled for troubleshooting. Press Ctrl+Shift+C to re-enable.
        </div>
      )}

      <ErrorBoundary>
        {songsData.length !== 0
          ? <>
            <div className='h-[90%] flex'>
              <Sidebar />
              <ErrorBoundary>
                <Routes>
                  <Route path="/" element={<Display />} />
                  <Route path="/search" element={<Search />} />
                  <Route path="*" element={<Display />} />
                </Routes>
              </ErrorBoundary>
              {showNowPlaying && <NowPlayingSidebar />}
              {showQueue && <QueueSidebar />}
            </div>
            <Player />
            {showFullscreen && <NowPlaying />}
            {showSelectPlaylist && <SelectPlaylistModal onClose={(playlistId) => {
              setShowSelectPlaylist(false);
              if (playlistId) {
                // Navigate to the playlist if a playlist was selected using React Router for instant navigation
                navigate(`/playlist/${playlistId}`);
              }
            }} />}
          </>
          : <div className="h-full w-full flex flex-col items-center justify-center text-white">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
              <p className="text-xl">Loading Musicify...</p>
              <p className="text-gray-400 mt-2">Please make sure the backend server is running at http://localhost:4000</p>
            </div>
        }
      </ErrorBoundary>

      {/* The preload='auto' and managing src via context is correct. No loop attribute needed here. */}
      <audio ref={audioRef} src={track ? track.file:""} preload='auto'></audio>
    </div>
  )
}

export default App