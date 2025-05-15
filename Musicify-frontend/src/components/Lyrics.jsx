import React, { useContext, useRef, useEffect, useState } from 'react';
import { PlayerContext } from '../context/PlayerContext';

const Lyrics = () => {
  const { currentLyrics, activeLyricIndex, track } = useContext(PlayerContext);
  const lyricsContainerRef = useRef(null);
  const activeLineRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);

  // Set loading state when track changes but lyrics haven't loaded yet
  useEffect(() => {
    if (track && track.lrcFile && currentLyrics.length === 0) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [track, currentLyrics.length]);

  // Scroll to active lyric when it changes
  useEffect(() => {
    if (activeLineRef.current && lyricsContainerRef.current) {
      // Scroll the active lyric into view with smooth animation
      activeLineRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      });
    }
  }, [activeLyricIndex]);

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <p className="text-lg">Loading lyrics...</p>
      </div>
    );
  }

  // If no lyrics or no track, show a message
  if (!track || !currentLyrics || currentLyrics.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400">
        <p className="text-lg">No lyrics available for this song</p>
        <p className="text-sm mt-2">Try another song or check back later</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div
        ref={lyricsContainerRef}
        className="h-full overflow-y-auto"
      >
        {currentLyrics.map((lyric, index) => (
          <p
            key={index}
            ref={index === activeLyricIndex ? activeLineRef : null}
            className={`py-2 transition-all duration-300 ${
              index === activeLyricIndex
                ? 'text-green-500 font-bold text-lg'
                : 'text-gray-300 text-base'
            }`}
          >
            {lyric.text}
          </p>
        ))}
      </div>
    </div>
  );
};

export default Lyrics;
