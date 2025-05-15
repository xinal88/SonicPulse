// Musicify-frontend/src/context/PlayerContext.jsx
import { createContext, useEffect, useRef, useState, useCallback } from "react";
import axios from 'axios';
import { fetchAndParseLRC } from "../utils/lrcParser";

export const PlayerContext = createContext();

const LOOP_MODE = {
    NO_LOOP: 0,
    LOOP_ONE: 1,
    LOOP_ALL: 2
};

const PlayerContextProvider = (props) => {
    const audioRef = useRef(new Audio()); // Initialize with a new Audio object
    const seekBg = useRef();
    const seekBar = useRef();

    const url = 'http://localhost:4000';

    const [songsData, setSongsData] = useState([]);
    const [albumsData, setAlbumsData] = useState([]);
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


    // Fetch initial data on mount
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

        getSongs();
        getAlbums();
    }, [/*track, url*/]); // Consider dependencies carefully if you auto-set track

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
                if (seekBar.current && audio.duration) { // Ensure audio.duration is not 0
                    seekBar.current.style.width = (Math.floor(audio.currentTime / audio.duration * 100)) + '%';
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
        if (audioRef.current && audioRef.current.duration && seekBg.current) {
            const newTime = ((e.nativeEvent.offsetX / seekBg.current.offsetWidth) * audioRef.current.duration);
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
        songsData, albumsData,
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
        toggleShuffleMode
    };

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
        </PlayerContext.Provider>
    );
}

export default PlayerContextProvider;
