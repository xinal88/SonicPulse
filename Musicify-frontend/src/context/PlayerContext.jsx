import { createContext, useEffect, useRef, useState } from "react";
import axios from 'axios';

export const PlayerContext = createContext();

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
                setTime(prev => ({
                    ...prev,
                    currentTime: {
                        second: Math.floor(audio.currentTime % 60),
                        minute: Math.floor(audio.currentTime / 60)
                    }
                }));
            };
            
            // Event listener for when the song ends
            const handleSongEnd = () => {
                // Implement what happens when a song ends (e.g., play next, stop)
                // For now, just set playStatus to false
                setPlayStatus(false); 
                // You might want to call next() here if continuous play is desired
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
    }, [track, playOnLoad]); // Rerun when track or playOnLoad changes

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
                play();
            }
            else {
                setTrack(selectedTrack);
                setPlayOnLoad(true); // Set intent to play this track once loaded
            }
        }
    };

    const findCurrentTrackIndex = () => {
        if (!track || !songsData.length) return -1;
        return songsData.findIndex(item => item._id === track._id);
    };

    const previous = async () => {
        songsData.map(async (item, index) => {
            if (track._id === item._id && index > 0) {
                await setTrack(songsData[index - 1]);
                await audioRef.current.play();
                setPlayStatus(true);
            }
        })
    };

    const next = async () => {
        songsData.map(async (item, index) => {
            if (track._id === item._id && index < songsData.length) {
                await setTrack(songsData[index + 1]);
                await audioRef.current.play();
                setPlayStatus(true);
            }
        })
    };

    const seekSong = (e) => {
        if (audioRef.current && audioRef.current.duration && seekBg.current) {
            audioRef.current.currentTime = ((e.nativeEvent.offsetX / seekBg.current.offsetWidth) * audioRef.current.duration);
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
        seekSong,
        songsData, albumsData
    };

    return (
        <PlayerContext.Provider value={contextValue}>
            {/* Ensure audioRef is actually connected to an <audio> element if not using new Audio() directly */}
            {/* If you don't have an <audio> tag in your JSX for this ref, the `new Audio()` approach is fine. */}
            {/* Example: <audio ref={audioRef} /> somewhere in your app, but it's not strictly needed with `new Audio()` */}
            {props.children}
        </PlayerContext.Provider>
    );
}

export default PlayerContextProvider;
