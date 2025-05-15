import React, { useContext, useEffect, useRef } from 'react'
import DisplayHome from './DisplayHome'
import {Routes, Route, useLocation} from 'react-router-dom'
import DisplayAlbum from './DisplayAlbum'
import DisplayArtist from './DisplayArtist'
import DisplayGenre from './DisplayGenre'
import Lyrics from './Lyrics'
import { PlayerContext } from '../context/PlayerContext'
import { assets } from '../assets/frontend-assets/assets'

const Display = () => {

    const {albumsData, artistsData, track, currentLyrics, showLyrics, setShowLyrics} = useContext(PlayerContext);

    const displayRef = useRef();
    const location = useLocation();
    const isAlbum = location.pathname.includes("album");
    const isArtist = location.pathname.includes("artist");
    const albumId = isAlbum ? location.pathname.split('/').pop() : "";
    const artistId = isArtist ? location.pathname.split('/').pop() : "";
    const albumBgColor = isAlbum && albumsData.length > 0 ? albumsData.find((x) => (x._id == albumId))?.bgColor : "#121212";
    const artistBgColor = isArtist && artistsData.length > 0 ? artistsData.find((x) => (x._id == artistId))?.bgColor : "#4c1d95";

    useEffect(()=>{
        if (isAlbum) {
            displayRef.current.style.background = `linear-gradient(${albumBgColor}, #121212)`;
        } else if (isArtist) {
            displayRef.current.style.background = `linear-gradient(${artistBgColor}, #121212)`;
        } else {
            displayRef.current.style.background = `#121212`;
        }
    }, [isAlbum, isArtist, albumBgColor, artistBgColor])

    // Lyrics display is now controlled by the mic icon in the Player component
    // The showLyrics state is managed in the PlayerContext

  return (
    <div ref={displayRef} className='w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white overflow-auto lg:w-[75%] lg:ml-0'>
        {showLyrics ? (
            <div className="h-full relative">
                <div className="flex items-center py-4 sticky top-0 z-10 bg-[#121212] shadow-md">
                    <img
                        src={assets.arrow_left}
                        alt="Back"
                        className="w-6 h-6 cursor-pointer hover:opacity-80 mr-2"
                        onClick={() => setShowLyrics(false)}
                        title="Back to Browse"
                    />
                    <h2 className="text-xl font-bold">Lyrics</h2>
                </div>
                <div className="h-[calc(100%-3.5rem)]">
                    <Lyrics />
                </div>
            </div>
        ) : (
            albumsData.length > 0 ? (
                <div>
                    <Routes>
                        <Route path='/' element={<DisplayHome/>}/>
                        <Route path='/album/:id' element={<DisplayAlbum album={albumsData.find((x) => (x._id == albumId))}/>}/>
                        <Route path='/artist/:id' element={<DisplayArtist />}/>
                        <Route path='/genre/:genreId' element={<DisplayGenre />}/>
                    </Routes>
                </div>
            ) : null
        )}
    </div>
  )
}

export default Display