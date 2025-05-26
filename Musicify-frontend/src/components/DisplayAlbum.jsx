import React, { useContext, useEffect, useState } from 'react'
import Navbar from './Navbar'
import { useParams } from 'react-router-dom';
import { assets } from '../assets/frontend-assets/assets';
import { PlayerContext } from '../context/PlayerContext';
import AddToPlaylistModal from './AddToPlaylistModal';

const DisplayAlbum = ({album}) => {

    const {id} = useParams();
    const [albumData, setAlbumData] = useState("");
    const [showAddToPlaylist, setShowAddToPlaylist] = useState(false);
    const [selectedSongId, setSelectedSongId] = useState(null);
    const {playWithId, albumsData, songsData} = useContext(PlayerContext);

    // Function to calculate total duration of all songs in the album
    const calculateTotalDuration = (songs) => {
        if (!songs || songs.length === 0) return "0 min";

        let totalMinutes = 0;
        let totalSeconds = 0;

        songs.forEach(song => {
            // Parse duration in format "mm:ss"
            const [minutes, seconds] = song.duration.split(':').map(Number);
            totalMinutes += minutes;
            totalSeconds += seconds;
        });

        // Convert excess seconds to minutes
        totalMinutes += Math.floor(totalSeconds / 60);
        totalSeconds = totalSeconds % 60;

        // Format the total duration
        const hours = Math.floor(totalMinutes / 60);
        const remainingMinutes = totalMinutes % 60;

        if (hours > 0) {
            return `about ${hours} hr ${remainingMinutes > 0 ? remainingMinutes + ' min' : ''}`;
        } else {
            return `about ${remainingMinutes} min`;
        }
    };

    useEffect(() => {
        albumsData.map((item) => {
            if (item._id === id) {
                setAlbumData(item);
            }
        })
    },[albumsData, id])

  return albumData ? (
    <>
        <div className='mt-10 flex gap-8 flex-col md:flex-row md:items-end'>
            <img className='w-48 rounded' src={albumData.image} alt="" />
            <div className='flex flex-col'>
                <p>Playlist</p>
                <h2 className='text-5xl font-bold mb-4 md:text-7xl'>{albumData.name}</h2>
                <h4>{albumData.desc}</h4>
                <p className='mt-1'>
                    <img className='inline-block w-5' src={assets.spotify_logo} alt="" />
                    <b>Spotify</b>
                    • 1,323,154 likes
                    • <b>{songsData.filter((item) => item.album === albumData.name).length} songs,</b>
                    {calculateTotalDuration(songsData.filter((item) => item.album === albumData.name))}
                </p>
            </div>
        </div>
        <div className='grid grid-cols-3 sm:grid-cols-5 mt-10 mb-4 pl-2 text-[#a7a7a7]'>
            <p><b className='mr-4'>#</b>Title</p>
            <p>Album</p>
            <p className='hidden sm:block'>Date Added</p>
            <p className='text-center'>Actions</p>
            <img className='m-auto w-4' src={assets.clock_icon} alt="" />
        </div>
        <hr />
        {
            songsData.filter((item) => item.album === albumData.name).map((item, index)=>(
                <div key={index} className='grid grid-cols-3 sm:grid-cols-5 gap-2 p-2 items-center text-[#a7a7a7] hover:bg-[#ffffff2b] group'>
                    <p className='text-white flex items-center cursor-pointer' onClick={()=>playWithId(item._id)}>
                        <b className='mr-4 text-[#a7a7a7]'>{index + 1}</b>
                        <img className='w-10 mr-5' src={item.image} alt="" />
                        <span className="flex flex-col">
                            <span>{item.name}</span>
                            <span className="text-sm text-[#a7a7a7]">{item.artistName || item.artist}</span>
                        </span>
                    </p>
                    <p className='text-[15px]'>{albumData.name}</p>
                    <p className='text-[15px] hidden sm:block'>5 days ago</p>
                    <div className='flex items-center justify-center gap-2'>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                playWithId(item._id);
                            }}
                            className='w-8 h-8 bg-green-500 rounded-full flex items-center justify-center hover:bg-green-400 transition-colors opacity-0 group-hover:opacity-100'
                            title="Play song"
                        >
                            <img src={assets.play_icon} alt="Play" className="w-4 h-4" />
                        </button>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setSelectedSongId(item._id);
                                setShowAddToPlaylist(true);
                            }}
                            className='w-8 h-8 bg-[#282828] rounded-full flex items-center justify-center hover:bg-[#3e3e3e] transition-colors opacity-0 group-hover:opacity-100'
                            title="Add to playlist"
                        >
                            <img src={assets.plus_icon} alt="Add to playlist" className="w-4 h-4" />
                        </button>
                    </div>
                    <p className='text-[15px] text-center'>{item.duration}</p>
                </div>
            ))
        }

        {/* Add to Playlist Modal */}
        {showAddToPlaylist && selectedSongId && (
            <AddToPlaylistModal
                songId={selectedSongId}
                onClose={() => {
                    setShowAddToPlaylist(false);
                    setSelectedSongId(null);
                }}
            />
        )}
    </>
  ) : "null"
}

export default DisplayAlbum