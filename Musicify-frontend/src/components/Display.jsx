import React, { useContext, useEffect, useRef } from 'react'
import DisplayHome from './DisplayHome'
import {Routes, Route, useLocation} from 'react-router-dom'
import DisplayAlbum from './DisplayAlbum'
import Lyrics from './Lyrics'
import { PlayerContext } from '../context/PlayerContext'
import { assets } from '../assets/frontend-assets/assets'

const Display = () => {

    const {albumsData, track, currentLyrics, showLyrics, setShowLyrics} = useContext(PlayerContext);

    const displayRef = useRef();
    const location = useLocation();
    const isAlbum = location.pathname.includes("album");
    const albumId = isAlbum ? location.pathname.split('/').pop() : "";
    const bgColor = isAlbum && albumsData.length > 0 ? albumsData.find((x) => (x._id == albumId)).bgColor : "#121212";

    useEffect(()=>{
        if (isAlbum) {
            displayRef.current.style.background = `linear-gradient(${bgColor}, #121212)`;
        } else {
            displayRef.current.style.background = `#121212`;
        }
    })

    // Lyrics display is now controlled by the mic icon in the Player component
    // The showLyrics state is managed in the PlayerContext

  return (
    <div ref={displayRef} className='w-[100%] m-2 px-6 pt-4 rounded bg-[#121212] text-white overflow-auto lg:w-[75%] lg:ml-0'>
        {showLyrics ? (
            <div className="h-full">
                <div className="flex items-center mb-4">
                    <img
                        src={assets.arrow_left}
                        alt="Back"
                        className="w-6 h-6 cursor-pointer hover:opacity-80 mr-2"
                        onClick={() => setShowLyrics(false)}
                        title="Back to Browse"
                    />
                    <h2 className="text-xl font-bold">Lyrics</h2>
                </div>
                <Lyrics />
            </div>
        ) : (
            albumsData.length > 0 ? (
                <div>
                    <Routes>
                        <Route path='/' element={<DisplayHome/>}/>
                        <Route path='/album/:id' element={<DisplayAlbum album={albumsData.find((x) => (x._id == albumId))}/>}/>
                    </Routes>
                </div>
            ) : null
        )}
    </div>
  )
}

export default Display