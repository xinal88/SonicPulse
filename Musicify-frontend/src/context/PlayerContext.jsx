// Musicify-frontend/src/context/PlayerContext.jsx
import { createContext, useEffect, useRef, useState, useCallback } from "react";
import axios from 'axios';
import { fetchAndParseLRC } from "../utils/lrcParser";
import { toast } from 'react-toastify';
import { useUser } from '@clerk/clerk-react';

export const PlayerContext = createContext();

const LOOP_MODE = {
    NO_LOOP: 0,
    LOOP_ONE: 1,
    LOOP_ALL: 2
};

const PlayerContextProvider = (props) => {
    const { user, isSignedIn } = useUser();
    const audioRef = useRef(new Audio()); // Initialize with a new Audio object
    const seekBg = useRef();
    const seekBar = useRef();
    // Create a ref to store all seekbar elements that need to be updated
    const seekBarsRef = useRef([]);
    // Create a ref to store all seekBg elements
    const seekBgRefs = useRef([]);

    const url = 'http://localhost:4000';

    const [songsData, setSongsData] = useState([]);
    const [albumsData, setAlbumsData] = useState([]);
    const [artistsData, setArtistsData] = useState([]);
    const [genresData, setGenresData] = useState([]);
    const [randomGenres, setRandomGenres] = useState([]);
    const [playlistsData, setPlaylistsData] = useState([]);
    const [currentPlaylist, setCurrentPlaylist] = useState(null);
    const [track, setTrack] = useState(null);
    const [playStatus, setPlayStatus] = useState(false);
    const [time, setTime] = useState({
        currentTime: { second: 0, minute: 0 },
        totalTime: { second: 0, minute: 0 }
    });
    const [playOnLoad, setPlayOnLoad] = useState(false);
    const [loopMode, setLoopMode] = useState(LOOP_MODE.NO_LOOP);
    const [loopCount, setLoopCount] = useState(0);
    const [currentLyrics, setCurrentLyrics] = useState([]);
    const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
    const [showLyrics, setShowLyrics] = useState(false);
    const [hasPrevious, setHasPrevious] = useState(false);
    const [hasNext, setHasNext] = useState(false);
    const [shuffleMode, setShuffleMode] = useState(false);

    const [volume, setVolume] = useState(1);
    const [isMuted, setIsMuted] = useState(false);
    const [previousVolume, setPreviousVolume] = useState(1); // Store volume before explicit mute
    const [showNowPlaying, setShowNowPlaying] = useState(false);
    const [showFullscreen, setShowFullscreen] = useState(false);
    const [isFullscreenMode, setIsFullscreenMode] = useState(false);
    const [showQueue, setShowQueue] = useState(false);
    const [showSelectPlaylist, setShowSelectPlaylist] = useState(false);

    const [currentLyricsSource, setCurrentLyricsSource] = useState('');

    useEffect(() => {
        // Initialize audio element properties when component mounts
        // This ensures the audio element starts with the correct volume and mute state
        const audio = audioRef.current;
        if (audio) {
            audio.volume = volume;
            audio.muted = isMuted;
        }
    }, []); // Runs once on mount. Volume/isMuted are initial values.

    const changeVolume = useCallback((newVolumeLevel) => {
        if (!audioRef.current) return;

        let newVolume = parseFloat(newVolumeLevel);
        newVolume = Math.max(0, Math.min(1, newVolume)); // Clamp between 0 and 1

        setVolume(newVolume);
        audioRef.current.volume = newVolume;

        // If volume is adjusted to be > 0, unmute the player
        if (newVolume > 0 && audioRef.current.muted) {
            audioRef.current.muted = false;
            setIsMuted(false);
        }
        // Note: Setting volume to 0 via slider does not automatically mute in this logic.
        // Mute is handled by toggleMuteHandler.
    }, [setIsMuted]); // audioRef is stable, setVolume is stable

    const toggleMuteHandler = useCallback(() => {
        if (!audioRef.current) return;

        const newMutedStatus = !audioRef.current.muted;
        audioRef.current.muted = newMutedStatus;
        setIsMuted(newMutedStatus);

        if (newMutedStatus) { // Just muted
            setPreviousVolume(volume); // Store current volume before muting
        } else { // Just unmuted
            // If volume was 0 when unmuting, restore to previousVolume or a default
            if (volume === 0) {
                const volumeToRestore = previousVolume > 0 ? previousVolume : 0.5;
                setVolume(volumeToRestore);
                audioRef.current.volume = volumeToRestore;
            }
            // If volume > 0, it's already set by the slider/changeVolume, no need to change here.
        }
    }, [volume, previousVolume, setIsMuted, setVolume]);


    // Fetch songs data
    useEffect(() => {
        const getSongs = async () => {
            try {
                const response = await axios.get(`${url}/api/song/list`);
                if (response.data.success && response.data.songs.length > 0) {
                    setSongsData(response.data.songs);
                    // Set initial track if none is set (optional, e.g., first song)
                    // if (!track && response.data.songs.length > 0) {
                    //     setTrack(response.data.songs[0]);
                    // }
                } else {
                    setSongsData([]);
                }
            } catch (error) {
                console.error("Error fetching songs:", error);
                setSongsData([]);
            }
        };

        getSongs();
    }, [url]);

    // Fetch albums and artists data
    useEffect(() => {
        const getAlbums = async () => {
            try {
                const response = await axios.get(`${url}/api/album/list`);
                if (response.data.success) {
                    setAlbumsData(response.data.albums);
                }
            } catch (error) {
                console.error("Error fetching albums:", error);
            }
        };

        const getArtists = async () => {
            try {
                const response = await axios.get(`${url}/api/artist/list`);
                if (response.data.success) {
                    setArtistsData(response.data.artists);
                }
            } catch (error) {
                console.error("Error fetching artists:", error);
            }
        };

        getAlbums();
        getArtists();
    }, [url]);

    // Fetch genres data and select random genres with songs
    useEffect(() => {
        const getGenres = async () => {
            try {
                // Request genres with song counts
                const response = await axios.get(`${url}/api/genre/list`, {
                    params: { includeCounts: 'true' }
                });

                if (response.data.success) {
                    const genres = response.data.genres;
                    setGenresData(genres);

                    // Filter genres to only include those that have at least one song
                    const genresWithSongs = genres.filter(genre => genre.songCount > 0);

                    console.log(`Found ${genresWithSongs.length} genres with songs out of ${genres.length} total genres`);

                    if (genresWithSongs.length > 0) {
                        // Shuffle the filtered genres array and take up to 3
                        const shuffled = [...genresWithSongs].sort(() => 0.5 - Math.random());
                        const selectedGenres = shuffled.slice(0, Math.min(3, genresWithSongs.length));
                        setRandomGenres(selectedGenres);
                        console.log('Selected random genres:', selectedGenres.map(g => g.name));
                    } else {
                        // If no genres have songs, set empty array
                        setRandomGenres([]);
                        console.log('No genres with songs found');
                    }
                }
            } catch (error) {
                console.error("Error fetching genres:", error);
            }
        };

        getGenres();
    }, [url]); // No longer dependent on songsData

    // Fetch playlists data
    useEffect(() => {
        const getPlaylists = async () => {
            try {
                const response = await axios.get(`${url}/api/playlist/list`);
                if (response.data.success) {
                    console.log('Initial playlists loaded:', response.data.playlists);
                    setPlaylistsData(response.data.playlists);
                }
            } catch (error) {
                console.error("Error fetching playlists:", error);
            }
        };

        getPlaylists();
    }, [url]);

    // Listen for messages from the Shazam popup
    useEffect(() => {
        const handleShazamMessage = (event) => {
            try {
                // Verify the origin if needed
                // if (event.origin !== 'http://localhost:3000') return;

                if (!event.data) return;

                if (event.data.type === 'SONG_IDENTIFIED' || event.data.type === 'SONG_SELECTED') {
                    const { song } = event.data;

                    // Validate song data
                    if (!song || (!song.title && !song.name)) {
                        console.warn('Invalid song data received:', song);
                        return;
                    }

                    // Try to find the song in our library
                    const songTitle = song.title || song.name;
                    const songArtist = song.artist || song.artistName;

                    // Look for a match by title and artist
                    const matchingSong = songsData.find(s =>
                        (s.name && songTitle && s.name.toLowerCase().includes(songTitle.toLowerCase())) ||
                        (songArtist && s.artistName && s.artistName.toLowerCase().includes(songArtist.toLowerCase()))
                    );

                    if (matchingSong) {
                        // Play the matching song
                        setTrack(matchingSong);
                        setPlayOnLoad(true);
                        toast.success(`Now playing: ${matchingSong.name} by ${matchingSong.artistName}`);
                    } else if (songTitle) {
                        // If no match found, show a message
                        toast.info(`Song "${songTitle}" ${songArtist ? `by ${songArtist}` : ''} not found in your library`);

                        // Optionally, you could open YouTube if youtubeId is available
                        if (song.youtubeId) {
                            window.open(`https://www.youtube.com/watch?v=${song.youtubeId}`, '_blank');
                        }
                    }
                }
            } catch (error) {
                console.error('Error handling Shazam message:', error);
            }
        };

        window.addEventListener('message', handleShazamMessage);

        return () => {
            window.removeEventListener('message', handleShazamMessage);
        };
    }, [songsData]);

    // Effect to handle track changes
    useEffect(() => {
        if (track && track.file) {
            const audio = audioRef.current;

            // Don't reset lyrics immediately - only when we know we need new ones
            // setCurrentLyrics([]);
            // setActiveLyricIndex(-1);

            const fetchLyrics = async () => {
                if (track.lrcFile) {
                    try {
                        // Show loading state only if we're fetching new lyrics
                        if (track.lrcFile !== currentLyricsSource) {
                            setCurrentLyrics([]);
                            setActiveLyricIndex(-1);

                            const parsedLyrics = await fetchAndParseLRC(track.lrcFile);
                            if (parsedLyrics.length > 0) {
                                setCurrentLyrics(parsedLyrics);
                                setCurrentLyricsSource(track.lrcFile);
                            }
                        }
                    } catch (error) {
                        console.error("Error loading lyrics:", error);
                    }
                } else {
                    // Only clear lyrics if we had some before
                    if (currentLyrics.length > 0) {
                        setCurrentLyrics([]);
                        setActiveLyricIndex(-1);
                        setCurrentLyricsSource('');
                    }
                }
            };

            fetchLyrics();

            const handleLoadedMetadata = () => {
                setTime(prev => ({
                    ...prev,
                    totalTime: {
                        second: Math.floor(audio.duration % 60),
                        minute: Math.floor(audio.duration / 60)
                    }
                }));
            };

            const handleTimeUpdate = () => {
                // Update the main seekBar if it exists
                if (seekBar.current && audio.duration) {
                    seekBar.current.style.width = (Math.floor(audio.currentTime / audio.duration * 100)) + '%';
                }

                // Update all registered seekbars
                if (audio.duration) {
                    const progressPercentage = (Math.floor(audio.currentTime / audio.duration * 100)) + '%';
                    // Update all seekbars in the array
                    seekBarsRef.current.forEach(bar => {
                        if (bar && bar !== seekBar.current) { // Skip the main seekBar which was already updated
                            bar.style.width = progressPercentage;
                        }
                    });
                }

                const currentTimeMs = audio.currentTime * 1000;
                setTime(prev => ({
                    ...prev,
                    currentTime: {
                        second: Math.floor(audio.currentTime % 60),
                        minute: Math.floor(audio.currentTime / 60)
                    }
                }));
                if (currentLyrics.length > 0) {
                    let newActiveIndex = -1;
                    for (let i = 0; i < currentLyrics.length; i++) {
                        if (currentLyrics[i].time <= currentTimeMs) {
                            newActiveIndex = i;
                        } else {
                            break;
                        }
                    }
                    if (newActiveIndex !== activeLyricIndex) {
                        setActiveLyricIndex(newActiveIndex);
                    }
                }
            };

            const handleSongEnd = async () => {
                switch (loopMode) {
                    case LOOP_MODE.LOOP_ONE:
                        if (loopCount < 1) {
                            setLoopCount(prev => prev + 1);
                            audio.currentTime = 0;
                            await play();
                        } else {
                            setPlayStatus(false);
                            setLoopCount(0);
                        }
                        break;
                    case LOOP_MODE.LOOP_ALL:
                        audio.currentTime = 0;
                        await play();
                        break;
                    case LOOP_MODE.NO_LOOP:
                    default:
                        setPlayStatus(false);
                        setActiveLyricIndex(-1);
                        if (hasNext) {
                            if (shuffleMode) {
                                await playRandomSong();
                            } else {
                                await next();
                            }
                        }
                        break;
                }
            };

            const handleCanPlay = async () => {
                if (playOnLoad) {
                    try {
                        await audio.play();
                        setPlayStatus(true);
                    } catch (error) {
                        console.error("Error playing audio in handleCanPlay:", error);
                        setPlayStatus(false);
                    } finally {
                        setPlayOnLoad(false); // Ensure this is always reset
                    }
                }
            };

            // Clean up previous event listeners
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleSongEnd);
            audio.removeEventListener('canplaythrough', handleCanPlay);

            // If the source is different, set it and load
            if (audio.src !== track.file) {
                audio.src = track.file;
                audio.load(); // Important to load the new source
                setLoopCount(0); // Reset loop count for the new track
            }

            // Apply current volume and mute status from context to the audio element
            audio.volume = volume;
            audio.muted = isMuted;

            // Add new event listeners
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('ended', handleSongEnd);
            audio.addEventListener('canplaythrough', handleCanPlay);


            // If playOnLoad is true and audio is ready, play it
            if (playOnLoad && audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                 handleCanPlay();
            }

            return () => { // Cleanup function
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleSongEnd);
                audio.removeEventListener('canplaythrough', handleCanPlay);
            };
        } else if (!track && audioRef.current.src) {
            // If track is nullified, pause and clear src
            audioRef.current.pause();
            audioRef.current.src = "";
            setPlayStatus(false);
            setTime({ currentTime: { second: 0, minute: 0 }, totalTime: { second: 0, minute: 0 } });
            if(seekBar.current) seekBar.current.style.width = '0%';
        }
    }, [track, playOnLoad, loopMode, loopCount, activeLyricIndex, currentLyrics.length, volume, isMuted, currentLyricsSource]); // Added volume & isMuted as they affect audio element directly


    const play = async () => {
        if (audioRef.current && audioRef.current.src && audioRef.current.paused) {
            try {
                await audioRef.current.play();
                setPlayStatus(true);
            } catch (error) {
                console.error("Error in play function:", error);
                setPlayStatus(false);
            }
        }
    };

    const pause = () => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            setPlayStatus(false);
        }
    };

    const toggleLyrics = () => {
        if (currentLyrics && currentLyrics.length > 0) {
            setShowLyrics(prev => !prev);
        }
    };

    const playWithId = async (id) => {
        const selectedTrack = songsData.find(item => item._id === id);
        if (selectedTrack) {
            if (track && track._id === selectedTrack._id && !audioRef.current.paused) {
                 // Optional: pause if same song is clicked while playing, or restart
                // audioRef.current.currentTime = 0;
                // await play();
            } else if (track && track._id === selectedTrack._id && audioRef.current.paused) {
                await play();
            } else {
                setTrack(selectedTrack);
                setPlayOnLoad(true); // Set flag to play when ready
            }
        }
    };

    const findCurrentTrackIndex = useCallback(() => {
        if (!track || !songsData.length) return -1;
        return songsData.findIndex(item => item._id === track._id);
    }, [track, songsData]);


    const updateNavigationStates = useCallback(() => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex === -1) {
            setHasPrevious(false);
            setHasNext(false);
            return;
        }
        setHasPrevious(currentIndex > 0);
        setHasNext(currentIndex < songsData.length - 1);
    }, [findCurrentTrackIndex, songsData.length]);


    useEffect(() => {
        updateNavigationStates();
    }, [track, songsData, updateNavigationStates]);

    const previous = async () => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex > 0) {
            setTrack(songsData[currentIndex - 1]);
            setPlayOnLoad(true);
        }
    };

    const next = async () => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex < songsData.length - 1) {
            setTrack(songsData[currentIndex + 1]);
            setPlayOnLoad(true);
        } else if (loopMode === LOOP_MODE.LOOP_ALL && songsData.length > 0) {
            setTrack(songsData[0]);
            setPlayOnLoad(true);
        }
    };

    const seekSong = (e) => {
        // Find the seekBg element that was clicked
        const clickedElement = e.currentTarget;

        if (audioRef.current && audioRef.current.duration && clickedElement) {
            const newTime = ((e.nativeEvent.offsetX / clickedElement.offsetWidth) * audioRef.current.duration);
            audioRef.current.currentTime = newTime;
        }
    };

    const toggleLoopMode = () => {
        setLoopMode(prevMode => {
            const nextMode = (prevMode + 1) % 3;
            if (nextMode !== LOOP_MODE.LOOP_ONE) {
                setLoopCount(0);
            }
            return nextMode;
        });
    };

    const toggleShuffleMode = () => {
        setShuffleMode(prev => !prev);
    };

    // Toggle browser fullscreen mode
    const toggleBrowserFullscreen = () => {
        if (!document.fullscreenElement) {
            // Enter fullscreen
            document.documentElement.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
            setIsFullscreenMode(true);
        } else {
            // Exit fullscreen
            if (document.exitFullscreen) {
                document.exitFullscreen();
                setIsFullscreenMode(false);
            }
        }
    };

    // Toggle the Queue view
    const toggleQueue = () => {
        setShowQueue(prev => !prev);
    };

    // Function to register a seekbar element for updates
    const registerSeekBar = (element) => {
        if (element && !seekBarsRef.current.includes(element)) {
            seekBarsRef.current.push(element);
        }
    };

    // Function to unregister a seekbar element
    const unregisterSeekBar = (element) => {
        if (element) {
            seekBarsRef.current = seekBarsRef.current.filter(bar => bar !== element);
        }
    };

    // Function to register a seekBg element
    const registerSeekBg = (element) => {
        if (element && !seekBgRefs.current.includes(element)) {
            seekBgRefs.current.push(element);
            // Set the main seekBg ref to the first registered element if it's not set
            if (!seekBg.current) {
                seekBg.current = element;
            }
        }
    };

    // Function to unregister a seekBg element
    const unregisterSeekBg = (element) => {
        if (element) {
            seekBgRefs.current = seekBgRefs.current.filter(bg => bg !== element);
            // If the unregistered element was the main seekBg, set the main seekBg to the first available element
            if (seekBg.current === element) {
                seekBg.current = seekBgRefs.current.length > 0 ? seekBgRefs.current[0] : null;
            }
        }
    };

    const playRandomSong = async () => {
        if (songsData.length <= 1) return;

        const currentIndex = findCurrentTrackIndex();
        let randomIndex;

        // Ensure we don't pick the same song
        do {
            randomIndex = Math.floor(Math.random() * songsData.length);
        } while (randomIndex === currentIndex);

        setTrack(songsData[randomIndex]);
        setPlayOnLoad(true);
    };

    // Playlist functions
    const createPlaylist = async (playlistData, imageFile) => {
        try {
            const formData = new FormData();
            formData.append('name', playlistData.name);
            formData.append('description', playlistData.description || '');
            formData.append('isPublic', playlistData.isPublic);
            formData.append('clerkId', playlistData.clerkId);

            if (imageFile) {
                formData.append('image', imageFile);
            }

            const response = await axios.post(`${url}/api/playlist/create`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                console.log('Playlist created successfully, refreshing playlist data...');
                // Refresh playlists data
                const playlistsResponse = await axios.get(`${url}/api/playlist/list`);
                if (playlistsResponse.data.success) {
                    console.log('Refreshed playlists:', playlistsResponse.data.playlists);
                    setPlaylistsData(playlistsResponse.data.playlists);
                } else {
                    console.error('Failed to refresh playlists:', playlistsResponse.data.message);
                }
                return { success: true, playlist: response.data.playlist };
            } else {
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('Error creating playlist:', error);
            return { success: false, message: error.response?.data?.message || 'Failed to create playlist' };
        }
    };

    const loadPlaylist = async (playlistId, clerkId = '') => {
        try {
            console.log(`[PlayerContext] Loading playlist ${playlistId}`);

            const response = await axios.get(`${url}/api/playlist/get`, {
                params: {
                    id: playlistId,
                    clerkId: clerkId
                }
            });

            if (response.data.success) {
                console.log(`[PlayerContext] Playlist loaded successfully`);
                setCurrentPlaylist(response.data.playlist);
                return { success: true, playlist: response.data.playlist };
            } else {
                console.error(`[PlayerContext] API returned error:`, response.data.message);
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('[PlayerContext] Error loading playlist:', error.message);

            if (error.code === 'NETWORK_ERROR' || error.message.includes('Network Error')) {
                return { success: false, message: 'Network connection failed. Please check if the backend server is running.' };
            }

            return { success: false, message: `Network error: ${error.message}` };
        }
    };

    const addSongToPlaylist = async (playlistId, songId, clerkId = '') => {
        try {
            const response = await axios.post(`${url}/api/playlist/add-song`, {
                playlistId: playlistId,
                songId: songId,
                clerkId: clerkId
            });

            if (response.data.success) {
                // Refresh current playlist if it's the one being modified
                if (currentPlaylist && currentPlaylist._id === playlistId) {
                    await loadPlaylist(playlistId, clerkId);
                }

                // Refresh playlists data
                const playlistsResponse = await axios.get(`${url}/api/playlist/list`);
                if (playlistsResponse.data.success) {
                    setPlaylistsData(playlistsResponse.data.playlists);
                }

                return { success: true };
            } else {
                return { success: false, message: response.data.message };
            }
        } catch (error) {
            console.error('Error adding song to playlist:', error);
            return { success: false, message: error.response?.data?.message || 'Failed to add song to playlist' };
        }
    };

    const removeSongFromPlaylist = (playlistId, songId, clerkId = '') => {
        // OPTIMISTIC UPDATE: Remove song from current playlist immediately
        let originalPlaylist = null;
        if (currentPlaylist && currentPlaylist._id === playlistId) {
            originalPlaylist = { ...currentPlaylist };
            const updatedSongs = currentPlaylist.songs.filter(song => song._id !== songId);
            setCurrentPlaylist({
                ...currentPlaylist,
                songs: updatedSongs,
                songCount: updatedSongs.length
            });
            console.log('Optimistically removed song from playlist UI');
        }

        // Send remove request to backend in background (fire-and-forget)
        axios.post(`${url}/api/playlist/remove-song`, {
            playlistId: playlistId,
            songId: songId,
            clerkId: clerkId
        }).then(response => {
            if (response.data.success) {
                console.log('Song removed successfully from backend');
                // Refresh playlists data to keep sidebar in sync
                axios.get(`${url}/api/playlist/list`).then(playlistsResponse => {
                    if (playlistsResponse.data.success) {
                        setPlaylistsData(playlistsResponse.data.playlists);
                    }
                });
            } else {
                // REVERT: Backend failed, restore the song in UI
                console.error('Backend remove failed, reverting UI:', response.data.message);
                if (originalPlaylist) {
                    setCurrentPlaylist(originalPlaylist);
                }
            }
        }).catch(error => {
            // REVERT: Network error, restore the song in UI
            console.error('Network error during song removal, reverting UI:', error);
            if (currentPlaylist && currentPlaylist._id === playlistId) {
                // Re-fetch to restore original state
                loadPlaylist(playlistId, clerkId);
            }
        });

        // Return immediately with success (optimistic)
        return Promise.resolve({ success: true });
    };

    const deletePlaylist = (playlistId, clerkId = '') => {
        // OPTIMISTIC UPDATE: Remove playlist from UI immediately
        const originalPlaylists = [...playlistsData];
        const updatedPlaylists = playlistsData.filter(playlist => playlist._id !== playlistId);
        setPlaylistsData(updatedPlaylists);

        console.log('Optimistically removed playlist from UI, sending delete request in background...');

        // Send delete request to backend in background (fire-and-forget)
        axios.post(`${url}/api/playlist/delete`, {
            id: playlistId,
            clerkId: clerkId
        }).then(response => {
            if (response.data.success) {
                console.log('Playlist deleted successfully on backend');
            } else {
                // REVERT: Backend failed, restore the playlist in UI
                console.error('Backend delete failed, reverting UI:', response.data.message);
                setPlaylistsData(originalPlaylists);
            }
        }).catch(error => {
            // REVERT: Network error, restore the playlist in UI
            console.error('Network error during delete, reverting UI:', error);
            // Restore original state by re-fetching (safest approach)
            axios.get(`${url}/api/playlist/list`).then(playlistsResponse => {
                if (playlistsResponse.data.success) {
                    setPlaylistsData(playlistsResponse.data.playlists);
                }
            }).catch(fetchError => {
                console.error('Failed to restore playlists after error:', fetchError);
            });
        });

        // Return immediately with success (optimistic)
        return Promise.resolve({ success: true, message: 'Playlist deleted successfully' });
    };

    const playPlaylist = async (playlistId, clerkId = '') => {
        try {
            // Load the playlist first
            const result = await loadPlaylist(playlistId, clerkId);
            if (result.success && result.playlist.songs && result.playlist.songs.length > 0) {
                // Play the first song in the playlist
                const firstSong = result.playlist.songs[0];
                setTrack(firstSong);
                setPlayOnLoad(true);
                return { success: true };
            } else {
                return { success: false, message: 'Playlist is empty or could not be loaded' };
            }
        } catch (error) {
            console.error('Error playing playlist:', error);
            return { success: false, message: 'Failed to play playlist' };
        }
    };

    const contextValue = {
        audioRef,
        seekBar,
        seekBg,
        track, setTrack,
        playStatus, setPlayStatus,
        time, setTime,
        play, pause,
        playWithId,
        previous, next,
        hasPrevious, hasNext,
        seekSong,
        loopMode,
        toggleLoopMode,
        LOOP_MODE,
        songsData, albumsData, artistsData, genresData, randomGenres,
        // Playlist data and functions
        playlistsData, setPlaylistsData,
        currentPlaylist, setCurrentPlaylist,
        createPlaylist,
        deletePlaylist,
        loadPlaylist,
        playPlaylist,
        addSongToPlaylist,
        removeSongFromPlaylist,
        showSelectPlaylist, setShowSelectPlaylist,
        currentLyrics,
        activeLyricIndex,
        showLyrics,
        setShowLyrics,
        toggleLyrics,
        // Volume and Mute
        volume,
        isMuted,
        changeVolume, // Use this function for setting volume directly
        toggleMuteHandler,
        previousVolume, setPreviousVolume, // Expose if needed elsewhere, though primarily internal
        shuffleMode,
        toggleShuffleMode,
        // Now Playing View and Fullscreen
        showNowPlaying,
        setShowNowPlaying,
        showFullscreen,
        setShowFullscreen,
        isFullscreenMode,
        toggleBrowserFullscreen,
        // Queue View
        showQueue,
        setShowQueue,
        toggleQueue,
        // Seekbar and SeekBg registration
        registerSeekBar,
        unregisterSeekBar,
        registerSeekBg,
        unregisterSeekBg
    };

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
        </PlayerContext.Provider>
    );
}

export default PlayerContextProvider;
