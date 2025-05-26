import React, { useContext, useState, useRef, useEffect } from 'react'
import { assets } from '../assets/frontend-assets/assets'
import { useNavigate, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react"
import { PlayerContext } from '../context/PlayerContext'
import { API_ENDPOINTS } from '../api/config'
import axios from 'axios'
import ErrorBoundary from './ErrorBoundary';

const Navbar = ({ showNavigation, backgroundColor = '#121212' }) => {
    const { randomGenres } = useContext(PlayerContext)
    const navigate = useNavigate()
    const location = useLocation()
    const [showShazamModal, setShowShazamModal] = useState(false)
    const [shazamLoading, setShazamLoading] = useState(false)
    const [shazamModalState, setShazamModalState] = useState({
        audioBlob: null,
        audioSource: null,
        audioUrl: null,
        matches: [],
        error: null,
        recording: false
    })
    const modalRef = useRef(null)

    // If showNavigation prop is not provided, determine based on location
    const shouldShowNavigation = showNavigation !== undefined
        ? showNavigation
        : location.pathname === '/'

    // Fix modal behavior to prevent reset on click outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (modalRef.current && !modalRef.current.contains(event.target)) {
                // Always allow hiding the modal when clicking outside
                setShowShazamModal(false);
                // We're not resetting state here, just hiding the modal
            }
        }

        // Add event listener only when modal is shown
        if (showShazamModal) {
            document.addEventListener("mousedown", handleClickOutside);
        }

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [showShazamModal]);

    // Toggle Shazam modal
    const toggleShazamModal = () => {
        setShowShazamModal(prev => !prev)
    }

    useEffect(() => {
        // Emergency escape hatch for frozen modal
        const handleEscapeKey = (e) => {
            if (e.key === 'Escape' && showShazamModal) {
                setShowShazamModal(false);
            }
        };

        window.addEventListener('keydown', handleEscapeKey);
        return () => window.removeEventListener('keydown', handleEscapeKey);
    }, [showShazamModal]);

    return (
        <>
            <div className='w-full flex justify-between items-center font-semibold py-3 px-6 h-14 shadow-sm' style={{ backgroundColor }}>
                <div className='flex items-center gap-3'>
                    <img onClick={() => navigate(-1)} className='w-8 bg-black p-1.5 rounded-2xl cursor-pointer hover:bg-gray-800 transition-colors' src={assets.arrow_left} alt="" />
                    <img onClick={() => navigate(1)} className='w-8 bg-black p-1.5 rounded-2xl cursor-pointer hover:bg-gray-800 transition-colors' src={assets.arrow_right} alt="" />
                </div>
                <div className='flex items-center gap-4 relative'>
                    <div
                        onClick={toggleShazamModal}
                        className='w-8 h-8 bg-white rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors'
                    >
                        <img
                            src={assets.shazam_icon}
                            alt="Shazam"
                            className="w-5 h-5"
                        />
                    </div>

                    {/* Shazam Modal - Always render but conditionally show/hide */}
                    <div
                        ref={modalRef}
                        className={`absolute top-12 right-0 w-96 bg-[#121212] border border-gray-700 rounded-xl shadow-2xl z-50 overflow-hidden transition-opacity duration-200 ${
                            showShazamModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                        }`}
                    >
                        <ErrorBoundary onReset={() => setShowShazamModal(false)}>
                            <ShazamModal
                                setShowShazamModal={setShowShazamModal}
                                setShazamLoading={setShazamLoading}
                                visible={showShazamModal}
                            />
                        </ErrorBoundary>
                    </div>

                    <SignedOut>
                        <SignInButton>
                            <button className='bg-white text-black px-4 py-1 rounded-2xl cursor-pointer'>
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8"
                                }
                            }}
                        />
                    </SignedIn>
                </div>
            </div>
            {shouldShowNavigation && (
                <div className='mt-8'>
                    <div className='flex flex-wrap gap-4'>
                        {randomGenres.map((item, index) => (
                            <p
                                key={index}
                                onClick={() => navigate(`/genre/${item._id}`)}
                                className='bg-[#232323] px-4 py-1 rounded-2xl cursor-pointer hover:bg-[#2a2a2a]'
                            >
                                {item.name}
                            </p>
                        ))}
                    </div>
                </div>
            )}
        </>
    )
}

// Shazam Modal Component
const ShazamModal = ({ setShowShazamModal, setShazamLoading, visible }) => {
    // Use refs to persist state between modal opens/closes
    const [recording, setRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState(null);
    const [processedBlob, setProcessedBlob] = useState(null);
    const [matches, setMatches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [audioSource, setAudioSource] = useState(null);
    const [audioUrl, setAudioUrl] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [recordingTimer, setRecordingTimer] = useState(null);
    const mediaRecorder = useRef(null);
    const audioChunks = useRef([]);

    // Add PlayerContext to access songsData and setTrack
    const { songsData, setTrack, play } = useContext(PlayerContext);

    // Update parent component's loading state when this component's loading state changes
    useEffect(() => {
        setShazamLoading(loading);
    }, [loading, setShazamLoading]);

    // When modal is closed, stop recording if in progress
    useEffect(() => {
        if (!visible && recording) {
            // Stop recording if it's in progress when modal is hidden
            if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
                mediaRecorder.current.stop();
                mediaRecorder.current.stream?.getTracks().forEach(track => track.stop());
                setRecording(false);
            }

            // Clear any timers
            if (recordingTimer) {
                clearInterval(recordingTimer);
                setRecordingTimer(null);
            }
        }
    }, [visible, recording, recordingTimer]);

    const MAX_RECORDING_TIME = 30; // Maximum recording time in seconds

    // Function to update recording timer
    const updateRecordingTime = () => {
        setRecordingTime(prevTime => {
            const newTime = prevTime + 1;
            if (newTime >= MAX_RECORDING_TIME) {
                stopRecording();
            }
            return newTime;
        });
    };

    // Reset audio state when clearing
    const clearAudio = () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
        setAudioBlob(null);
        setProcessedBlob(null);
        setAudioSource(null);
        setAudioUrl(null);
        setError(null);
        setRecordingTime(0);
        // Reset file input if it exists
        const fileInput = document.getElementById('audio-file-input');
        if (fileInput) fileInput.value = '';
    };

    // Function to convert audio to WAV format
    const convertToWav = async (blob) => {
        try {
            console.log("Converting audio to WAV format...");
            // Create an audio context
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();

            // Convert blob to array buffer
            const arrayBuffer = await blob.arrayBuffer();

            // Decode the audio data
            console.log("Decoding audio data...");
            const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            console.log("Audio decoded successfully");

            // Get audio properties
            const numberOfChannels = audioBuffer.numberOfChannels;
            const length = audioBuffer.length;
            const sampleRate = audioBuffer.sampleRate;

            console.log("Audio properties:", {
                numberOfChannels,
                length,
                sampleRate
            });

            // Create WAV file
            const wavBuffer = createWavBuffer(audioBuffer);
            console.log("WAV buffer created, size:", wavBuffer.byteLength);

            // Convert buffer to blob
            const wavBlob = new Blob([wavBuffer], { type: 'audio/wav' });
            console.log("WAV blob created, size:", wavBlob.size);

            return wavBlob;
        } catch (error) {
            console.error("Error converting to WAV:", error);
            throw error;
        }
    };

    // Function to create a WAV buffer from an AudioBuffer
    const createWavBuffer = (audioBuffer) => {
        const numOfChan = audioBuffer.numberOfChannels;
        const length = audioBuffer.length * numOfChan * 2; // 2 bytes per sample (16-bit)
        const buffer = new ArrayBuffer(44 + length);
        const view = new DataView(buffer);

        // Write WAV header
        // "RIFF" chunk descriptor
        writeString(view, 0, 'RIFF');
        view.setUint32(4, 36 + length, true);
        writeString(view, 8, 'WAVE');

        // "fmt " sub-chunk
        writeString(view, 12, 'fmt ');
        view.setUint32(16, 16, true); // fmt chunk size
        view.setUint16(20, 1, true); // audio format (1 for PCM)
        view.setUint16(22, numOfChan, true); // number of channels
        view.setUint32(24, audioBuffer.sampleRate, true); // sample rate
        view.setUint32(28, audioBuffer.sampleRate * numOfChan * 2, true); // byte rate
        view.setUint16(32, numOfChan * 2, true); // block align
        view.setUint16(34, 16, true); // bits per sample

        // "data" sub-chunk
        writeString(view, 36, 'data');
        view.setUint32(40, length, true); // data chunk size

        // Write audio data
        let offset = 44;
        for (let i = 0; i < audioBuffer.length; i++) {
            for (let channel = 0; channel < numOfChan; channel++) {
                const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(channel)[i]));
                const int16Sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
                view.setInt16(offset, int16Sample, true);
                offset += 2;
            }
        }

        return buffer;
    };

    // Helper function to write a string to a DataView
    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            // Use a widely supported format
            const options = {
                mimeType: 'audio/webm;codecs=opus',
                audioBitsPerSecond: 128000
            };

            console.log("Recording with options:", options);
            mediaRecorder.current = new MediaRecorder(stream, options)
            audioChunks.current = []
            setRecordingTime(0);

            mediaRecorder.current.ondataavailable = (event) => {
                audioChunks.current.push(event.data)
            }

            mediaRecorder.current.onstop = async () => {
                const recordedBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
                console.log("Recording stopped, blob size:", recordedBlob.size);

                try {
                    // For playback, use the original blob
                    setAudioBlob(recordedBlob);
                    setAudioSource('recording');

                    // Create URL for audio playback
                    const url = URL.createObjectURL(recordedBlob);
                    setAudioUrl(url);

                    // Store the blob for sending to server
                    setProcessedBlob(recordedBlob);

                    // Clear timer
                    if (recordingTimer) {
                        clearInterval(recordingTimer);
                        setRecordingTimer(null);
                    }
                } catch (err) {
                    console.error('Error processing audio:', err);
                    setError('Error processing audio');
                }
            }

            mediaRecorder.current.start(100)
            setRecording(true)
            setError(null)

            // Start timer
            const timer = setInterval(updateRecordingTime, 1000);
            setRecordingTimer(timer);
        } catch (err) {
            console.error('Error starting recording:', err);
            setError('Error accessing microphone. Please ensure you have granted permission.')
        }
    }

    const stopRecording = () => {
        if (mediaRecorder.current && recording) {
            mediaRecorder.current.stop()
            setRecording(false)
            mediaRecorder.current.stream.getTracks().forEach(track => track.stop())

            // Clear timer
            if (recordingTimer) {
                clearInterval(recordingTimer);
                setRecordingTimer(null);
            }
        }
    }

    const handleFileUpload = async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        try {
            // Immediately show loading state
            setLoading(true);

            // Just store the file directly without processing
            setAudioBlob(file);
            setAudioSource('file');
            setAudioUrl(URL.createObjectURL(file));

            // Skip WAV conversion until actually needed
            setProcessedBlob(null);
            setError(null);
        } catch (err) {
            console.error('Error handling file:', err);
            setError('Error selecting file');
        } finally {
            setLoading(false);
        }
    };

    // Clean up URLs when component unmounts
    useEffect(() => {
        return () => {
            if (audioUrl) {
                URL.revokeObjectURL(audioUrl);
            }
            if (recordingTimer) {
                clearInterval(recordingTimer);
            }
        };
    }, [audioUrl, recordingTimer]);

    const identifySong = async () => {
        if (!audioBlob) {
            setError("No audio recorded or selected");
            return;
        }

        setLoading(true);
        setError(null);
        setMatches([]);

        try {
            // Create a very small form with just the file
            const formData = new FormData();

            // Make sure we set the correct filename extension
            let filename = 'sample.audio';
            if (audioSource === 'recording') {
                filename = 'recording.webm';
            } else if (audioBlob.name) {
                filename = audioBlob.name;
            }

            formData.append('sample', audioBlob, filename);

            console.log("Sending request with file:", filename, audioBlob.type, audioBlob.size);

            // Set a timeout and abort controller
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 60000);

            // Make the request with minimal processing
            const response = await axios.post(API_ENDPOINTS.FIND_SONG, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                },
                signal: controller.signal,
                withCredentials: false
            });

            clearTimeout(timeoutId);

            if (response.data.success === false) {
                setError(response.data.message || "Failed to identify song");
                return;
            }

            // First try to get matches with confidence >= 75%
            let songMatches = response.data.matches
                ?.filter(match => {
                    const confidence = typeof match.confidence === 'number'
                        ? match.confidence
                        : typeof match.score === 'number'
                            ? Math.round(match.score * 100)
                            : 0;
                    return confidence >= 75 && (match.name || match.title);
                })
                .slice(0, 3) || [];

            // If no matches meet the threshold, just take top 3 regardless of confidence
            if (songMatches.length === 0 && response.data.matches?.length > 0) {
                songMatches = response.data.matches
                    .filter(match => match.name || match.title)
                    .slice(0, 3);

                // Add a note that these are lower confidence matches
                setError("No matches with high confidence found. Showing best available matches.");
            }

            setMatches(songMatches);

            // Debug log to check what's being set
            console.log("Setting matches:", songMatches);
        } catch (error) {
            console.error("Error identifying song:", error);
            if (error.name === 'AbortError') {
                setError("Request timed out. Please try a smaller audio file.");
            } else if (error.message.includes('Network Error')) {
                setError("Network error. Please check your connection and try again.");
            } else {
                setError(error.response?.data?.message || "Error processing audio");
            }
        } finally {
            setLoading(false);
        }
    };

    const playInMusicify = (match) => {
        // Try to find the song in our library
        if (match && (match.name || match.title)) {
            console.log("Trying to find match for:", match.name || match.title, match.artist);

            // First try to match by ID if available
            if (match.songId) {
                const exactMatch = songsData.find(s => s._id === match.songId);
                if (exactMatch) {
                    console.log("Found exact match by ID:", exactMatch.name);
                    setTrack(exactMatch);
                    setShowShazamModal(false); // Close modal

                    // Play the song immediately
                    setTimeout(() => {
                        play();
                    }, 100);
                    return;
                }
            }

            // Try more flexible matching if ID match fails
            // Normalize strings for comparison (lowercase, remove special chars)
            const normalizeText = (text) => {
                return text ? text.toLowerCase().replace(/[^\w\s]/g, '') : '';
            };

            const normalizedTitle = normalizeText(match.name || match.title);
            const normalizedArtist = normalizeText(match.artist);

            // Look for a match by title and artist with more flexible matching
            const matchingSong = songsData.find(s => {
                const songTitle = normalizeText(s.name);
                const songArtist = normalizeText(s.artistName);

                // Check if title contains our search or vice versa
                const titleMatch = songTitle.includes(normalizedTitle) ||
                                   normalizedTitle.includes(songTitle);

                // Check if artist contains our search or vice versa
                const artistMatch = !normalizedArtist || !songArtist ? true : // Skip artist matching if either is missing
                                    songArtist.includes(normalizedArtist) ||
                                    normalizedArtist.includes(songArtist);

                return titleMatch && artistMatch;
            });

            if (matchingSong) {
                // Play the matching song
                console.log("Found matching song:", matchingSong.name);
                setTrack(matchingSong);
                setShowShazamModal(false); // Close modal

                // Play the song immediately
                setTimeout(() => {
                    play();
                }, 100);
            } else {
                // If no match found, show a message
                console.log("No matching song found in library");
                alert(`Song "${match.name || match.title}" by ${match.artist || 'Unknown Artist'} not found in your library`);
                setShowShazamModal(false); // Close modal
            }
        }
    }

    // Standardize button styles
    const buttonClass = "w-full py-2 px-4 mb-2 rounded-md font-medium transition-colors focus:outline-none";
    const activeButtonClass = `${buttonClass} bg-green-600 text-white hover:bg-green-700`;
    const inactiveButtonClass = `${buttonClass} bg-gray-800 text-white hover:bg-gray-700`;

    return (
        <div className="p-4 text-white">
            <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                <h2 className="text-xl font-bold text-center flex items-center">
                    <img src={assets.shazam_icon} alt="Shazam" className="w-5 h-5 mr-2" />
                    Find Song
                </h2>
                <button
                    onClick={() => setShowShazamModal(false)}
                    className="text-gray-400 hover:text-white"
                >
                    ✕
                </button>
            </div>

            <div className="space-y-4">
                <div className="bg-[#232323] p-4 rounded-lg mb-4">
                    <h3 className="text-lg font-semibold mb-3">Choose Input Method</h3>

                    {/* Recording Timer */}
                    {recording && (
                        <div className="mb-3 p-2 bg-red-900/50 rounded-lg text-center">
                            Recording: {recordingTime}s / {MAX_RECORDING_TIME}s
                            <div className="w-full bg-gray-700 h-1 mt-1 rounded-full overflow-hidden">
                                <div
                                    className="bg-red-500 h-full"
                                    style={{ width: `${(recordingTime / MAX_RECORDING_TIME) * 100}%` }}
                                ></div>
                            </div>
                        </div>
                    )}

                    {/* Audio Source Indicator & Player */}
                    {audioBlob && (
                        <div className="mb-3 p-2 bg-gray-700 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center">
                                    <span className="text-green-400 mr-2">✓</span>
                                    <span className="text-white">
                                        {audioSource === 'recording'
                                            ? 'Using recorded audio sample'
                                            : 'Using uploaded audio file'}
                                    </span>
                                </div>
                                <button
                                    onClick={clearAudio}
                                    className="px-2 py-1 bg-gray-600 hover:bg-gray-500 text-white rounded"
                                >
                                    Clear
                                </button>
                            </div>

                            {/* Audio Player */}
                            {audioUrl && (
                                <div className="mt-2">
                                    <audio
                                        controls
                                        className="w-full"
                                        src={audioUrl}
                                        preload="metadata"
                                        controlsList="nodownload"
                                    >
                                        Your browser does not support the audio element.
                                    </audio>
                                    <div className="text-xs text-gray-400 mt-1 text-center">
                                        {audioSource === 'recording'
                                            ? `${recordingTime} second${recordingTime !== 1 ? 's' : ''} recording`
                                            : 'Uploaded audio file'}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="flex flex-col space-y-4">
                        {/* Record Audio Option */}
                        <div>
                            <button
                                onClick={recording ? stopRecording : startRecording}
                                disabled={audioBlob && audioSource === 'file'} // Disable if file is uploaded
                                className={`px-4 py-2 rounded-lg font-medium transition-colors duration-200 w-full ${
                                    recording
                                        ? 'bg-red-500 hover:bg-red-600 text-white'
                                        : audioBlob && audioSource === 'file'
                                            ? 'bg-gray-500 cursor-not-allowed'
                                            : audioSource === 'recording'
                                                ? 'bg-green-600 hover:bg-green-700 text-white' // Active recording
                                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                            >
                                {recording ? (
                                    <span className="flex items-center justify-center">
                                        <span className="animate-pulse mr-2">⚪</span>
                                        Stop Recording ({recordingTime}s / {MAX_RECORDING_TIME}s)
                                    </span>
                                ) : audioSource === 'recording' ? (
                                    'Re-record Audio'
                                ) : (
                                    'Record Audio'
                                )}
                            </button>
                        </div>

                        <div className="text-center text-gray-400">OR</div>

                        {/* Upload File Option */}
                        <div>
                            <label
                                className={`block px-4 py-2 rounded-lg font-medium transition-colors duration-200 w-full text-center cursor-pointer ${
                                    audioBlob && audioSource === 'recording'
                                        ? 'bg-gray-500 cursor-not-allowed'
                                        : audioSource === 'file'
                                            ? 'bg-green-600 hover:bg-green-700 text-white' // Active file
                                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                                }`}
                            >
                                {audioSource === 'file' ? 'Change Audio File' : 'Upload Audio File'}
                                <input
                                    id="audio-file-input"
                                    type="file"
                                    accept="audio/*"
                                    onChange={handleFileUpload}
                                    disabled={audioBlob && audioSource === 'recording'} // Disable if recording
                                    className="hidden"
                                />
                            </label>
                        </div>
                    </div>
                </div>

                <button
                    onClick={identifySong}
                    disabled={loading || !audioBlob}
                    className={`w-full px-4 py-2 mt-3 rounded-lg font-medium transition-colors duration-200 bg-green-500 text-white hover:bg-green-600 ${
                        loading || !audioBlob ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                >
                    {loading ? (
                        <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Analyzing...
                        </span>
                    ) : !audioBlob ? (
                        'Select or Record Audio First'
                    ) : (
                        'Find Song'
                    )}
                </button>

                {/* Results Section */}
                <div className="bg-[#232323] p-4 rounded-lg">
                    <h3 className="text-lg font-semibold mb-3">Results</h3>

                    {matches.length > 0 ? (
                        <div className="space-y-3 max-h-60 overflow-y-auto">
                            {matches.map((match, index) => (
                                <div
                                    key={index}
                                    className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg mb-2 flex items-center cursor-pointer hover:bg-gray-600 transition-colors"
                                    onClick={() => playInMusicify(match)}
                                >
                                    {/* Song image */}
                                    <div className="w-12 h-12 mr-3 flex-shrink-0">
                                        <img
                                            src={match.image || assets.default_album}
                                            alt={match.title || match.name}
                                            className="w-full h-full object-cover rounded"
                                        />
                                    </div>

                                    {/* Song details */}
                                    <div className="flex-grow">
                                        <div className="font-medium">
                                            {match.name || match.title} - {match.artist || 'Unknown Artist'}
                                        </div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Confidence: {typeof match.confidence === 'number'
                                                ? `${match.confidence}%`
                                                : typeof match.score === 'number'
                                                    ? `${(match.score * 100).toFixed(1)}%`
                                                    : 'Unknown'}
                                            {match.consecutive > 1 && ` (${match.consecutive} consecutive matches)`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4 text-gray-400">
                            {loading ? (
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mb-2"></div>
                                    <p>Analyzing audio...</p>
                                </div>
                            ) : (
                                <p>Record or upload audio to identify songs</p>
                            )}
                        </div>
                    )}

                    {/* Display error message below results if there is one */}
                    {error && (
                        <div className="p-3 mt-3 bg-red-900/50 text-red-200 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default Navbar
