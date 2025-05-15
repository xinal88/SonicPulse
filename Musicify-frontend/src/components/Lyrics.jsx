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
      // Calculate position to account for the fixed header
      const headerHeight = 56; // Approximate height of the header (3.5rem)
      const container = lyricsContainerRef.current;
      const element = activeLineRef.current;
      const elementRect = element.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();

      // Calculate the scroll position that centers the element in the visible area
      const scrollTop = element.offsetTop - container.offsetTop -
                        (containerRect.height / 2) + (elementRect.height / 2) - headerHeight;

      // Scroll with smooth animation
      container.scrollTo({
        top: scrollTop,
        behavior: 'smooth'
      });
    }
  }, [activeLyricIndex]);

  // If loading, show loading indicator
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 pt-8">
        <p className="text-lg">Loading lyrics...</p>
      </div>
    );
  }

  // If no lyrics or no track, show a message
  if (!track || !currentLyrics || currentLyrics.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 pt-8">
        <p className="text-lg">No lyrics available for this song</p>
        <p className="text-sm mt-2">Try another song or check back later</p>
      </div>
    );
  }

  return (
    <div className="h-full">
      <div
        ref={lyricsContainerRef}
        className="h-full overflow-y-auto pb-8"
      >
        {/* Add some padding at the top for better spacing */}
        <div className="pt-2"></div>

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

        {/* Add some padding at the bottom for better spacing */}
        <div className="pb-8"></div>
      </div>
    </div>
  );
};

export default Lyrics;
