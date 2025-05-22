import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { PlayerContext } from '../context/PlayerContext';
import ErrorBoundary from './ErrorBoundary';
import Lyrics from './Lyrics';

const Search = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasSearched, setHasSearched] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const {
    songsData,
    playWithId,
    showLyrics,
    setShowLyrics
  } = useContext(PlayerContext);

  // Define performSearch function before using it in useEffect
  const performSearch = async (term) => {
    if (!term.trim()) return;

    if (showLyrics && setShowLyrics) {
      setShowLyrics(false);
    }

    setLoading(true);
    setError(null); // Clear any previous errors
    setHasSearched(true);

    try {
      // Create an array to hold all search results
      let results = [];

      // Search for songs via API
      try {
        const songResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/search?q=${encodeURIComponent(term)}`);
        if (songResponse.data && songResponse.data.results) {
          results = [...songResponse.data.results];
        }
      } catch (songErr) {
        console.error('Song search error:', songErr);
        // Continue with other searches even if song search fails
      }

      // Search for albums via API
      try {
        const albumResponse = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/album/list?search=${encodeURIComponent(term)}`);
        if (albumResponse.data && albumResponse.data.success && albumResponse.data.albums) {
          // Format album results to match our result structure
          const albumResults = albumResponse.data.albums.map(album => ({
            _id: album._id,
            title: album.name,
            artist: album.artist || '',
            type: 'album',
            image: album.image || 'https://via.placeholder.com/150?text=Album',
            desc: album.desc
          }));

          // Add albums to results
          results = [...results, ...albumResults];
        }
      } catch (albumErr) {
        console.error('Album search error:', albumErr);
        // Continue with other searches even if album search fails
      }

      // Also search locally in the loaded data for songs
      if (songsData && songsData.length > 0) {
        // Filter songs by name, artist or album
        const filteredSongs = songsData.filter(song =>
          (song.name && song.name.toLowerCase().includes(term.toLowerCase())) ||
          (song.artistName && song.artistName.toLowerCase().includes(term.toLowerCase())) ||
          (song.album && song.album.toLowerCase().includes(term.toLowerCase()))
        );

        // Add local songs to results if they're not already included
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

      setSearchResults(results);
    } catch (err) {
      console.error('Search error:', err);
      // Don't set error message to avoid showing the red box
      // setError('Failed to perform search. Please try again.');

      // Fallback to local search only if API fails
      if (songsData && songsData.length > 0) {
        const filteredSongs = songsData.filter(song =>
          (song.name && song.name.toLowerCase().includes(term.toLowerCase())) ||
          (song.artistName && song.artistName.toLowerCase().includes(term.toLowerCase())) ||
          (song.album && song.album.toLowerCase().includes(term.toLowerCase()))
        );

        const formattedResults = filteredSongs.map(item => ({
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

  useEffect(() => {
    document.title = "Search - Musicify";
    if (setShowLyrics && showLyrics) {
      setShowLyrics(false);
    }

    // Check for search query in URL
    const queryParams = new URLSearchParams(location.search);
    const queryTerm = queryParams.get('q');
    if (queryTerm) {
      setSearchTerm(queryTerm);
      performSearch(queryTerm);
    }
  }, [location.search, setShowLyrics, showLyrics]);

  const handleResultClick = (item) => {
    try {
      if (item.type === 'song') {
        if (setShowLyrics && showLyrics) {
          setShowLyrics(false);
        }

        setTimeout(() => {
          if (playWithId) {
            playWithId(item._id);
          } else {
            setError('Unable to play song. Player functionality not available.');
          }
        }, 100);
      } else if (item.type === 'album') {
        navigate(`/album/${item._id}`);
      } else if (item.type === 'artist') {
        navigate(`/artist/${item._id}`);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    }
  };

  return (
    <ErrorBoundary>
      <div className="w-full h-full bg-[#121212] text-white p-6 overflow-y-auto">
        {showLyrics ? (
          <div className="h-full">
            <div className="mb-4">
              <div
                className="flex items-center py-4 cursor-pointer"
                onClick={() => setShowLyrics(false)}
              >
                <span className="text-2xl mr-3">&lt;</span>
                <span className="text-xl font-bold">Lyrics</span>
              </div>
            </div>
            <div className="h-[calc(100%-3.5rem)]">
              <Lyrics />
            </div>
          </div>
        ) : (
          <>
            <h1 className="text-2xl font-bold mb-6">Search Results</h1>

            {loading ? (
              <div className="text-center py-4">
                <p>Searching...</p>
              </div>
            ) : (
              hasSearched && searchResults.length > 0 && (
                <div>
                  <h2 className="text-xl font-bold mb-4">Results</h2>
                  <div className="flex flex-wrap gap-4">
                    {searchResults.map((item) => (
                      <div
                        key={item._id}
                        className="min-w-[180px] w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26]"
                        onClick={() => handleResultClick(item)}
                      >
                        <div className="w-full h-[180px] overflow-hidden">
                          <img
                            src={item.image}
                            alt={item.title}
                            className="rounded w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = 'https://via.placeholder.com/150?text=No+Image';
                            }}
                          />
                        </div>
                        <p className="font-bold mt-2 mb-1 truncate">{item.title}</p>
                        <p className="text-slate-200 text-sm truncate">{item.artist || (item.type === 'album' ? 'Album' : item.type === 'artist' ? 'Artist' : '')}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )
            )}

            {!loading && hasSearched && searchResults.length === 0 && (
              <div className="text-center py-4">
                <p>No results found for "{searchTerm}"</p>
              </div>
            )}
          </>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default Search;




























