/**
 * Fetches and parses LRC file content from a URL
 * 
 * @param {string} lrcUrl - URL to the LRC file
 * @returns {Promise<Array>} Promise resolving to an array of objects with time (in milliseconds) and text properties
 */
export const fetchAndParseLRC = async (lrcUrl) => {
    if (!lrcUrl) return [];
    
    try {
        // Fetch the LRC file content
        const response = await fetch(lrcUrl);
        if (!response.ok) {
            throw new Error(`Failed to fetch LRC file: ${response.status} ${response.statusText}`);
        }
        
        const lrcContent = await response.text();
        return parseLRC(lrcContent);
    } catch (error) {
        console.error("Error fetching or parsing LRC file:", error);
        return [];
    }
};

/**
 * Parses LRC file content and extracts timestamps and lyrics
 * LRC format example:
 * [00:12.00]Line 1 lyrics
 * [00:17.20]Line 2 lyrics
 * 
 * @param {string} lrcContent - The content of the LRC file
 * @returns {Array} Array of objects with time (in milliseconds) and text properties
 */
export const parseLRC = (lrcContent) => {
    if (!lrcContent) return [];
    
    const lines = lrcContent.trim().split('\n');
    const timeRegex = /\[(\d{2}):(\d{2})\.(\d{2})\]/g;
    const parsedLyrics = [];
    
    lines.forEach(line => {
        // Skip empty lines or metadata lines (like [ar:Artist])
        if (!line.trim() || (line.startsWith('[') && !timeRegex.test(line))) {
            return;
        }
        
        // Reset regex lastIndex
        timeRegex.lastIndex = 0;
        
        let match;
        let lyricText = line;
        
        // Extract all timestamps in the line
        while ((match = timeRegex.exec(line)) !== null) {
            const minutes = parseInt(match[1], 10);
            const seconds = parseInt(match[2], 10);
            const hundredths = parseInt(match[3], 10);
            
            // Convert to milliseconds
            const timeMs = (minutes * 60 * 1000) + (seconds * 1000) + (hundredths * 10);
            
            // Remove the timestamp from the lyric text
            lyricText = lyricText.replace(match[0], '');
            
            // Add to parsed lyrics
            parsedLyrics.push({
                time: timeMs,
                text: lyricText.trim()
            });
        }
    });
    
    // Sort by time
    return parsedLyrics.sort((a, b) => a.time - b.time);
};
