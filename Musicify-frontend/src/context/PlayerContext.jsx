// Musicify-frontend/src/context/PlayerContext.jsx
import { createContext, useEffect, useRef, useState } from "react";
import axios from 'axios';
import { fetchAndParseLRC } from "../utils/lrcParser";

export const PlayerContext = createContext();

// Define Loop Modes
const LOOP_MODE = {
    NO_LOOP: 0, // Song plays once, then stops
    LOOP_ONE: 1, // Song plays twice, then stops
    LOOP_ALL: 2  // Song loops indefinitely
};

const PlayerContextProvider = (props) => {
    const audioRef = useRef(new Audio()); // Initialize Audio object here
    const seekBg = useRef();
    const seekBar = useRef();

    const url = 'http://localhost:4000';

    const [songsData, setSongsData] = useState([]);
    const [albumsData, setAlbumsData] = useState([]);
    const [track, setTrack] = useState(null); // Initialize track as null
    const [playStatus, setPlayStatus] = useState(false);
    const [time, setTime] = useState({
        currentTime: { second: 0, minute: 0 },
        totalTime: { second: 0, minute: 0 }
    });
    // To handle intent to play after track selection
    const [playOnLoad, setPlayOnLoad] = useState(false);

    // New state for loop mode
    const [loopMode, setLoopMode] = useState(LOOP_MODE.NO_LOOP);
    // New state to count plays for LOOP_ONE mode
    const [loopCount, setLoopCount] = useState(0);

    // Lyrics state
    const [currentLyrics, setCurrentLyrics] = useState([]);
    const [activeLyricIndex, setActiveLyricIndex] = useState(-1);
    const [showLyrics, setShowLyrics] = useState(false);
    const [hasPrevious, setHasPrevious] = useState(false);
    const [hasNext, setHasNext] = useState(false);

    // Function to toggle lyrics display
    const toggleLyrics = () => {
        if (currentLyrics && currentLyrics.length > 0) {
            setShowLyrics(prev => !prev);
        }
    };


    // Fetch initial data on mount
    useEffect(() => {
        const getSongs = async () => {
            try {
                const response = await axios.get(`${url}/api/song/list`);
                if (response.data.success && response.data.songs.length > 0) {
                    setSongsData(response.data.songs);
                    // Optionally set the first song as the initial track, but don't auto-play
                    // setTrack(response.data.songs[0]);
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
    }, []); // Empty dependency array: runs only once on mount

    // Effect to handle track changes: update src, load, and play if intended
    useEffect(() => {
        if (track && track.file) { // track.file should be the audio URL
            const audio = audioRef.current;

            // Reset lyrics state
            setCurrentLyrics([]);
            setActiveLyricIndex(-1);

            // Fetch and parse LRC file if available
            const fetchLyrics = async () => {
                if (track.lrcFile) {
                    try {
                        const parsedLyrics = await fetchAndParseLRC(track.lrcFile);
                        if (parsedLyrics.length > 0) {
                            setCurrentLyrics(parsedLyrics);
                            console.log(`Loaded ${parsedLyrics.length} lyric lines`);
                        }
                    } catch (error) {
                        console.error("Error loading lyrics:", error);
                    }
                }
            };

            fetchLyrics();

            // Event listener for when metadata is loaded (duration is available)
            const handleLoadedMetadata = () => {
                setTime(prev => ({
                    ...prev,
                    totalTime: {
                        second: Math.floor(audio.duration % 60),
                        minute: Math.floor(audio.duration / 60)
                    }
                }));
            };

            // Event listener for time updates
            const handleTimeUpdate = () => {
                if (seekBar.current) { // Ensure seekBar ref is available
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

                // Update active lyric based on current time
                if (currentLyrics.length > 0) {
                    // Find the last lyric that should be displayed at the current time
                    let newActiveIndex = -1;
                    for (let i = 0; i < currentLyrics.length; i++) {
                        if (currentLyrics[i].time <= currentTimeMs) {
                            newActiveIndex = i;
                        } else {
                            break; // Lyrics are sorted by time, so we can stop once we find a future lyric
                        }
                    }

                    if (newActiveIndex !== activeLyricIndex) {
                        setActiveLyricIndex(newActiveIndex);
                    }
                }
            };

            // Event listener for when the song ends
            const handleSongEnd = async () => {
                switch (loopMode) {
                    case LOOP_MODE.LOOP_ONE:
                        if (loopCount < 1) { // Play once more (total 2 times)
                            setLoopCount(prev => prev + 1);
                            audio.currentTime = 0;
                            await play();
                        } else {
                            setPlayStatus(false);
                            setLoopCount(0); // Reset for next time
                            // Optionally move to the next song or just stop
                            // await next(); // Uncomment to play next song after LOOP_ONE completes
                        }
                        break;
                    case LOOP_MODE.LOOP_ALL:
                        audio.currentTime = 0;
                        await play();
                        break;
                    case LOOP_MODE.NO_LOOP:
                    default:
                        setPlayStatus(false);
                        setActiveLyricIndex(-1); // Reset active lyric
                        // Optionally move to the next song
                        // await next(); // Uncomment to automatically play next song
                        break;
                }
            };

            // Event listener for when the audio can play (good time to actually play)
            const handleCanPlay = async () => {
                if (playOnLoad) {
                    try {
                        await audio.play();
                        setPlayStatus(true);
                        setPlayOnLoad(false); // Reset the flag
                    } catch (error) {
                        console.error("Error playing audio in handleCanPlay:", error);
                        setPlayStatus(false); // Ensure UI reflects paused state on error
                        setPlayOnLoad(false);
                    }
                }
            };

            // Clean up previous event listeners before adding new ones
            audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
            audio.removeEventListener('timeupdate', handleTimeUpdate);
            audio.removeEventListener('ended', handleSongEnd);
            audio.removeEventListener('canplaythrough', handleCanPlay); // or 'canplay'

            // Set new source and load
            if (audio.src !== track.file) { // Only update if src is different
                audio.src = track.file;
                audio.load(); // Important: load the new source
                setLoopCount(0); // Reset loop count when track changes
            }


            // Add event listeners
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('timeupdate', handleTimeUpdate);
            audio.addEventListener('ended', handleSongEnd);
            audio.addEventListener('canplaythrough', handleCanPlay); // or 'canplay'

            // If playOnLoad is already true (e.g. from playWithId) and audio is ready, try to play
            // This handles cases where canplaythrough might have fired before this effect ran for a new track
            if (playOnLoad && audio.readyState >= HTMLMediaElement.HAVE_ENOUGH_DATA) {
                 handleCanPlay();
            }


            // Cleanup function for when the component unmounts or track changes again
            return () => {
                audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                audio.removeEventListener('timeupdate', handleTimeUpdate);
                audio.removeEventListener('ended', handleSongEnd);
                audio.removeEventListener('canplaythrough', handleCanPlay);
                // Optional: Pause and reset src if track is removed or component unmounts
                // audio.pause();
                // if (!track) audio.src = '';
            };
        }
    }, [track, playOnLoad, loopMode, loopCount]); // Added loopMode and loopCount as dependencies

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

    const playWithId = async (id) => {
        const selectedTrack = songsData.find(item => item._id === id);
        if (selectedTrack) {
            if (track && track._id === selectedTrack._id && !audioRef.current.paused) {
                // If same song is clicked and it's already playing, do nothing or pause
                // pause(); // Example: pause if same song is clicked while playing
            } else if (track && track._id === selectedTrack._id && audioRef.current.paused) {
                // If same song is clicked and it's paused, play it
                await play();
            }
            else {
                setTrack(selectedTrack);
                setPlayOnLoad(true); // Set intent to play this track once loaded
                setLoopCount(0); // Reset loop count when a new song is played
            }
        }
    };

    const findCurrentTrackIndex = () => {
        if (!track || !songsData.length) return -1;
        return songsData.findIndex(item => item._id === track._id);
    };

    // Update navigation button states based on current track index
    const updateNavigationStates = () => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex === -1) {
            setHasPrevious(false);
            setHasNext(false);
            return;
        }

        setHasPrevious(currentIndex > 0);
        setHasNext(currentIndex < songsData.length - 1);
    };

    // Effect to update navigation states when track or songsData changes
    useEffect(() => {
        updateNavigationStates();
    }, [track, songsData]);

    const previous = async () => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex > 0) {
            setTrack(songsData[currentIndex - 1]);
            setPlayOnLoad(true);
            setLoopCount(0);
        }
    };

    const next = async () => {
        const currentIndex = findCurrentTrackIndex();
        if (currentIndex < songsData.length - 1) {
            setTrack(songsData[currentIndex + 1]);
            setPlayOnLoad(true);
            setLoopCount(0);
        } else if (loopMode === LOOP_MODE.LOOP_ALL && songsData.length > 0) { // Loop back to first song if LOOP_ALL
            setTrack(songsData[0]);
            setPlayOnLoad(true);
            setLoopCount(0);
        }
    };

    const seekSong = (e) => {
        if (audioRef.current && audioRef.current.duration && seekBg.current) {
            const newTime = ((e.nativeEvent.offsetX / seekBg.current.offsetWidth) * audioRef.current.duration);
            audioRef.current.currentTime = newTime;

            // Update active lyric index when seeking
            if (currentLyrics.length > 0) {
                const currentTimeMs = newTime * 1000;
                let newActiveIndex = -1;
                for (let i = 0; i < currentLyrics.length; i++) {
                    if (currentLyrics[i].time <= currentTimeMs) {
                        newActiveIndex = i;
                    } else {
                        break;
                    }
                }
                setActiveLyricIndex(newActiveIndex);
            }
        }
    };

    // Function to toggle loop mode
    const toggleLoopMode = () => {
        setLoopMode(prevMode => {
            const nextMode = (prevMode + 1) % 3; // Cycle through 0, 1, 2
            if (nextMode !== LOOP_MODE.LOOP_ONE) { // Reset loopCount if not entering LOOP_ONE
                setLoopCount(0);
            }
            return nextMode;
        });
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
        // Expose loop state and toggle function
        loopMode,
        toggleLoopMode,
        LOOP_MODE, // Expose LOOP_MODE constants if needed by components
        songsData, albumsData,
        currentLyrics,
        activeLyricIndex,
        showLyrics,
        setShowLyrics,
        toggleLyrics
    };

    return (
        <PlayerContext.Provider value={contextValue}>
            {props.children}
        </PlayerContext.Provider>
    );
}

export default PlayerContextProvider;