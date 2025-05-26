import React, { useContext, useState, useEffect, useRef } from 'react';
import { assets } from '../assets/frontend-assets/assets';
import { useNavigate } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import PlaylistItem from './PlaylistItem';
import CreatePlaylist from './CreatePlaylist';
import { PlayerContext } from '../context/PlayerContext';
import axios from 'axios';

const Sidebar = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const { songsData, playWithId, playlistsData, createPlaylist } = useContext(PlayerContext);

    // Search state
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [showSearchResults, setShowSearchResults] = useState(false);
    const [loading, setLoading] = useState(false);
    const searchRef = useRef(null);

    // Playlist modal state
    const [showCreatePlaylist, setShowCreatePlaylist] = useState(false);

    // Handle search
    const performSearch = async (term) => {
        if (!term.trim()) {
            setSearchResults([]);
            setShowSearchResults(false);
            return;
        }

        setLoading(true);
        setShowSearchResults(true);

        try {
            let results = [];

            // Search for songs via API
            try {
                const songResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/search?q=${encodeURIComponent(term)}`);
                if (songResponse.data && songResponse.data.results) {
                    results = [...songResponse.data.results];
                }
            } catch (songErr) {
                console.error('Song search error:', songErr);
            }

            // Search for albums via API
            try {
                const albumResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/album/list?search=${encodeURIComponent(term)}`);
                if (albumResponse.data && albumResponse.data.success && albumResponse.data.albums) {
                    const albumResults = albumResponse.data.albums.map(album => ({
                        _id: album._id,
                        title: album.name,
                        artist: album.artist || '',
                        type: 'album',
                        image: album.image || 'https://via.placeholder.com/150?text=Album',
                        desc: album.desc
                    }));
                    results = [...results, ...albumResults];
                }
            } catch (albumErr) {
                console.error('Album search error:', albumErr);
            }

            // Also search locally in the loaded data for songs
            if (songsData && songsData.length > 0) {
                const filteredSongs = songsData.filter(song =>
                    (song.name && song.name.toLowerCase().includes(term.toLowerCase())) ||
                    (song.artistName && song.artistName.toLowerCase().includes(term.toLowerCase())) ||
                    (song.album && song.album.toLowerCase().includes(term.toLowerCase()))
                );

                if (filteredSongs.length > 0) {
                    const existingIds = new Set(results.map(item => item._id));
                    filteredSongs.forEach(item => {
                        if (!existingIds.has(item._id)) {
                            results.push({
                                _id: item._id,
                                title: item.name || item.title,
                                artist: item.artistName || item.artist,
                                type: 'song',
                                image: item.image,
                                file: item.file
                            });
                        }
                    });
                }
            }

            setSearchResults(results.slice(0, 8)); // Limit to 8 results for sidebar
        } catch (err) {
            console.error('Search error:', err);
            // Fallback to local search only
            if (songsData && songsData.length > 0) {
                const filteredSongs = songsData.filter(song =>
                    (song.name && song.name.toLowerCase().includes(term.toLowerCase())) ||
                    (song.artistName && song.artistName.toLowerCase().includes(term.toLowerCase())) ||
                    (song.album && song.album.toLowerCase().includes(term.toLowerCase()))
                );

                const formattedResults = filteredSongs.slice(0, 8).map(item => ({
                    _id: item._id,
                    title: item.name || item.title,
                    artist: item.artistName || item.artist,
                    type: 'song',
                    image: item.image,
                    file: item.file
                }));

                setSearchResults(formattedResults);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSearchChange = (e) => {
        const value = e.target.value;
        setSearchTerm(value);

        // Debounce search
        if (value.trim()) {
            setTimeout(() => {
                performSearch(value);
            }, 300);
        } else {
            setSearchResults([]);
            setShowSearchResults(false);
        }
    };

    const handleResultClick = (item) => {
        try {
            if (item.type === 'song') {
                if (playWithId) {
                    playWithId(item._id);
                }
            } else if (item.type === 'album') {
                navigate(`/album/${item._id}`);
            } else if (item.type === 'artist') {
                navigate(`/artist/${item._id}`);
            }
            // Clear search after selection
            setSearchTerm('');
            setSearchResults([]);
            setShowSearchResults(false);
        } catch (err) {
            console.error('Error handling result click:', err);
        }
    };

    // Filter playlists to show only user's playlists
    const userPlaylists = playlistsData.filter(playlist => {
        if (!user || !playlist.creator) return false;

        // Debug logging
        console.log('Filtering playlist:', playlist.name);
        console.log('Playlist creator:', playlist.creator);
        console.log('Current user ID (Clerk):', user.id);

        // Check if the user is the creator
        // The creator field should have clerkId when populated from User model
        const isOwner = (playlist.creator.clerkId && playlist.creator.clerkId === user.id) ||
                       (playlist.creator._id && playlist.creator._id === user.id) ||
                       (playlist.creator === user.id); // In case creator is just the ID string

        console.log('Is owner:', isOwner);
        return isOwner;
    });

    // Debug logging for playlist counts
    console.log('Total playlists:', playlistsData.length);
    console.log('User playlists:', userPlaylists.length);
    console.log('User playlists:', userPlaylists);

    // Handle playlist creation
    const handleCreatePlaylist = () => {
        if (!user) {
            // Could show a toast or redirect to login
            console.log('User must be logged in to create playlist');
            return;
        }
        setShowCreatePlaylist(true);
    };

    const handlePlaylistCreated = (newPlaylist) => {
        setShowCreatePlaylist(false);
        // The PlayerContext will automatically refresh playlistsData
        console.log('Playlist created:', newPlaylist);
    };

    // Close search results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowSearchResults(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

  return (
    <div className='w-[25%] h-full p-2 flex-col gap-2 text-white hidden lg:flex'>
      <div className='bg-[#121212] h-[15%] rounded flex flex-col justify-around'>
        <div onClick={()=>navigate('/')} className='flex items-center gap-3 pl-8 cursor-pointer'>
          <img className='w-6' src={assets.home_icon} alt="" />
          <p className='font-bold'>Home</p>
        </div>
        {/* Search Input */}
        <div ref={searchRef} className='relative px-4'>
          <div className='relative'>
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search songs, artists, albums..."
              className="w-full px-3 py-2 pl-10 text-white bg-[#2a2a2a] border border-gray-600 rounded-full focus:outline-none focus:border-white focus:bg-[#3a3a3a] transition-colors text-sm"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              <img src={assets.search_icon} alt="Search" className="w-4 h-4 opacity-70" />
            </div>
            {loading && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
              </div>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearchResults && (
            <div className="absolute top-full left-4 right-4 mt-1 bg-[#2a2a2a] border border-gray-600 rounded-lg shadow-lg z-50 max-h-80 overflow-y-auto">
              {searchResults.length > 0 ? (
                <div className="py-2">
                  {searchResults.map((item) => (
                    <div
                      key={item._id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-[#3a3a3a] cursor-pointer"
                      onClick={() => handleResultClick(item)}
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-10 h-10 rounded object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = 'https://via.placeholder.com/40?text=♪';
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-medium truncate">{item.title}</p>
                        <p className="text-gray-400 text-xs truncate">
                          {item.artist} {item.type === 'album' ? '• Album' : item.type === 'artist' ? '• Artist' : ''}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-4 text-center text-gray-400 text-sm">
                  {loading ? 'Searching...' : 'No results found'}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className='bg-[#121212] h-[85%] rounded'>
        <div className='p-4 flex items-center justify-between'>
          <div className='flex items-center gap-3'>
            <img className='w-8' src={assets.stack_icon} alt="" />
            <p>Your Library</p>
          </div>
          <div className='flex items-center gap-3'>
            <img className='w-5' src={assets.arrow_icon} alt="" />
            <img
              className='w-5 cursor-pointer hover:scale-110 transition-transform'
              src={assets.plus_icon}
              alt="Create Playlist"
              onClick={handleCreatePlaylist}
              title="Create Playlist"
            />
          </div>
        </div>
        {/* Show "Create your first playlist" only when user has no playlists */}
        {user && userPlaylists.length === 0 && (
          <div className='p-4 bg-[#242424] m-2 rounded font-semibold flex flex-col items-start justify-start gap-1 pl-4'>
            <h1>Create your first playlist</h1>
            <p className='font-light'>It's easy, we will help you</p>
            <button
              onClick={handleCreatePlaylist}
              className='px-4 py-1.5 bg-white text-[15px] text-black rounded-full mt-4 hover:scale-105 transition-transform'
            >
              Create Playlist
            </button>
          </div>
        )}

        {/* Display existing user playlists */}
        {user && userPlaylists.length > 0 && (
          <div className='mt-4 px-2'>
            <h3 className='text-sm font-semibold text-gray-400 mb-2 px-2'>Recently Created</h3>
            <div className='space-y-1'>
              {userPlaylists.slice(0, 5).map((playlist) => (
                <PlaylistItem key={playlist._id} playlist={playlist} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create Playlist Modal */}
      {showCreatePlaylist && (
        <CreatePlaylist
          onClose={() => setShowCreatePlaylist(false)}
          onPlaylistCreated={handlePlaylistCreated}
        />
      )}
    </div>
  )
}

export default Sidebar