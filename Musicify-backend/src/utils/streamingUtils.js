import SpotifyWebApi from 'spotify-web-api-node';
import ytdl from 'ytdl-core';
import { YouTube } from 'youtube-sr';
import ffmpeg from 'fluent-ffmpeg';
import fs from 'fs/promises';

// Initialize Spotify API client
const spotifyApi = new SpotifyWebApi({
    clientId: process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET
});

// Spotify related utilities
export const refreshSpotifyToken = async () => {
    const data = await spotifyApi.clientCredentialsGrant();
    spotifyApi.setAccessToken(data.body['access_token']);
};

export const extractSpotifyTrackId = (url) => {
    const regex = /track\/([a-zA-Z0-9]+)/;
    const matches = url.match(regex);
    return matches ? matches[1] : null;
};

// Helper function to format duration
const formatDuration = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

export const getSpotifyTrackInfo = async (trackId) => {
    try {
        await refreshSpotifyToken();
        const track = await spotifyApi.getTrack(trackId);
        
        // Get detailed info for each artist
        const artistPromises = track.body.artists.map(async (artist) => {
            const artistDetails = await spotifyApi.getArtist(artist.id);
            return {
                name: artist.name,
                image: artistDetails.body.images[0]?.url,
                // Generate a random pastel color if artist has an image
                bgColor: artistDetails.body.images[0]?.url ?
                    '#' + Math.floor(Math.random()*16777215).toString(16) :
                    '#e0e0e0'
            };
        });
        
        const artistsWithDetails = await Promise.all(artistPromises);
        console.log('Artists with details:', artistsWithDetails);
        
        return {
            name: track.body.name,
            artists: artistsWithDetails,
            image: track.body.album.images[0]?.url,
            duration: formatDuration(track.body.duration_ms / 1000)
        };
    } catch (error) {
        console.error('Error getting Spotify track info:', error);
        throw error;
    }
};

// YouTube related utilities
export const findYouTubeId = async (searchQuery) => {
    try {
        console.log('Searching YouTube for:', searchQuery);
        // YouTube.search returns a Promise<Video[]>
        const videos = await YouTube.search(searchQuery, { limit: 1, type: "video" });
        
        if (videos && videos.length > 0) {
            const videoId = videos[0].id;
            console.log('Found video:', videos[0].title, 'ID:', videoId);
            return videoId;
        }
        console.log('No videos found for query:', searchQuery);
        return null;
    } catch (error) {
        console.error('Error finding YouTube video:', error);
        return null;
    }
};

export const findAndDownloadYoutubeAudio = async (searchQuery) => {
    let tempFilePath = null;
    try {
        const videoId = await findYouTubeId(searchQuery);
        if (!videoId) throw new Error('No YouTube video found');

        const ytUrl = `https://www.youtube.com/watch?v=${videoId}`;
        console.log('Downloading from URL:', ytUrl);
        
        const info = await ytdl.getInfo(videoId);
        const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');
        console.log('Available audio formats:', audioFormats.length);
        
        if (audioFormats.length === 0) throw new Error('No audio formats found');

        // Choose the highest quality audio format
        const audioFormat = audioFormats.sort((a, b) => b.audioBitrate - a.audioBitrate)[0];
        console.log('Selected format:', audioFormat.audioBitrate + 'kbps');

        tempFilePath = `temp_${Date.now()}.mp3`;
        console.log('Saving to:', tempFilePath);

        await new Promise((resolve, reject) => {
            // Create a readable stream from ytdl
            const stream = ytdl(ytUrl, { 
                format: audioFormat,
                quality: 'highestaudio'
            });

            // Set up error handling for the stream
            stream.on('error', (err) => {
                console.error('YouTube download error:', err);
                reject(err);
            });

            // Create FFmpeg command
            const command = ffmpeg(stream)
                .toFormat('mp3')
                .audioCodec('libmp3lame')
                .audioBitrate(audioFormat.audioBitrate || 192)
                .on('start', (commandLine) => {
                    console.log('FFmpeg started:', commandLine);
                })
                .on('progress', (progress) => {
                    if (progress.percent) {
                        console.log(`Processing: ${Math.round(progress.percent)}% done`);
                    }
                })
                .on('end', () => {
                    console.log('FFmpeg processing completed');
                    resolve();
                })
                .on('error', (err) => {
                    console.error('FFmpeg error:', err);
                    reject(err);
                });

            // Save the output
            command.save(tempFilePath);
        });

        return {
            path: tempFilePath,
            duration: formatDuration(info.videoDetails.lengthSeconds)
        };
    } catch (error) {
        // Clean up temp file if it exists and there was an error
        if (tempFilePath) {
            try {
                await fs.unlink(tempFilePath);
                console.log('Cleaned up temporary file after error');
            } catch (cleanupError) {
                console.error('Error cleaning up temporary file:', cleanupError);
            }
        }
        console.error('Error downloading YouTube audio:', error);
        throw error;
    }
};