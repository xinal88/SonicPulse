import React, { useContext } from 'react'
import Navbar from './Navbar'
import AlbumItem from './AlbumItem'
import SongItem from './SongItem'
import ArtistItem from './ArtistItem'
import { PlayerContext } from '../context/PlayerContext'

const DisplayHome = () => {
    const {songsData, albumsData, artistsData} = useContext(PlayerContext);

    // Check if data is still loading
    const isLoading = !songsData || !albumsData || !artistsData ||
                     (songsData.length === 0 && albumsData.length === 0 && artistsData.length === 0);

    if (isLoading) {
        return (
            <>
                <Navbar showNavigation={true} />
                <div className="h-full w-full flex flex-col items-center justify-center text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
                    <p className="text-lg">Loading content...</p>
                </div>
            </>
        );
    }

  return (
    <>
        <div className='mb-4'>
            <h1 className='my-5 font-bold text-2xl'>Feature Charts</h1>
            <div className='flex overflow-auto'>
                {albumsData && albumsData.length > 0 ?
                    albumsData.map((item, index)=>(<AlbumItem key={index} name={item.name} desc={item.desc} id={item._id} image={item.image}/>)) :
                    <p className="text-gray-400">No albums available</p>
                }
            </div>
        </div>
        <div className='mb-4'>
            <h1 className='my-5 font-bold text-2xl'>Today's biggest hits</h1>
            <div className='flex overflow-auto'>
                {songsData && songsData.length > 0 ?
                    songsData.map((item, index)=>(<SongItem key={index} name={item.name} artist={item.artistName || item.artist} id={item._id} image={item.image}/>)) :
                    <p className="text-gray-400">No songs available</p>
                }
            </div>
        </div>
        <div className='mb-4'>
            <h1 className='my-5 font-bold text-2xl'>Popular Artists</h1>
            <div className='flex overflow-auto'>
                {artistsData && artistsData.length > 0 ?
                    artistsData.map((artist, index)=>(<ArtistItem key={index} id={artist._id} name={artist.name} image={artist.image} />)) :
                    <p className="text-gray-400">No artists available</p>
                }
            </div>
        </div>
    </>
  )
}

export default DisplayHome