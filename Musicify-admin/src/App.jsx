import React, { useState, useEffect } from 'react'
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { useLocation, useNavigate, Routes, Route } from 'react-router-dom';
import AddAlbum from './pages/AddAlbum';
import ListSong from './pages/ListSong';
import ListAlbum from './pages/ListAlbum';
import AddSong from './pages/AddSong';
import EditAlbum from './pages/EditAlbum';
import EditSong from './pages/EditSong';
import AddArtist from './pages/AddArtist';
import ListArtist from './pages/ListArtist';
import EditArtist from './pages/EditArtist';
import ListGenre from './pages/ListGenre';
import AddGenre from './pages/AddGenre';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';

export const url = 'http://localhost:4000'

const App = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentPath, setCurrentPath] = useState(location.pathname);
  const [activeTab, setActiveTab] = useState('add'); // Default tab

  // Update current path when location changes
  useEffect(() => {
    // Extract the base path and ID for edit routes
    const path = location.pathname;
    if (path.includes('/edit-')) {
      setActiveTab('edit');
    } else if (path.includes('/list-')) {
      setActiveTab('list');
    } else if (path.includes('/add-')) {
      setActiveTab('add');
    }
    
    setCurrentPath(path);
  }, [location]);

  // Function to navigate to a path
  const navigateTo = (path) => {
    navigate(path);
  };

  // Function to switch tabs
  const switchTab = (tab) => {
    setActiveTab(tab);
    // Navigate to the first item in the selected tab category
    switch(tab) {
      case 'add':
        navigate('/add-song');
        break;
      case 'list':
        navigate('/list-song');
        break;
      case 'edit':
        // For edit tab, we might not want to navigate automatically
        // as it depends on what the user wants to edit
        break;
      default:
        navigate('/add-song');
    }
  };

  return (
    <div className='flex items-start min-h-screen'>
      <ToastContainer/>
      <Sidebar currentPath={currentPath} navigateTo={navigateTo} activeTab={activeTab} switchTab={switchTab} />
      <div className='flex-1 h-screen overflow-y-scroll bg-[#f3fff7]'>
        <Navbar />
        <div className='pt-8 pl-5 sm:pt-12 sm:pl-12'>
          <Routes>
            {/* Add Routes */}
            <Route path="/add-song" element={<AddSong />} />
            <Route path="/add-album" element={<AddAlbum />} />
            <Route path="/add-artist" element={<AddArtist />} />
            <Route path="/add-genre" element={<AddGenre />} />
            
            {/* List Routes */}
            <Route path="/list-song" element={<ListSong />} />
            <Route path="/list-album" element={<ListAlbum />} />
            <Route path="/list-artist" element={<ListArtist />} />
            <Route path="/list-genre" element={<ListGenre />} />
            
            {/* Edit Routes */}
            <Route path="/edit-song/:id" element={<EditSong />} />
            <Route path="/edit-album/:id" element={<EditAlbum />} />
            <Route path="/edit-artist/:id" element={<EditArtist />} />
            
            {/* Default Route */}
            <Route path="/" element={<AddSong />} />
          </Routes>
        </div>
      </div>
    </div>
  )
}

export default App
