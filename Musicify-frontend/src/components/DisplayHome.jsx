import React, { useContext } from 'react'
import Navbar from './Navbar'
import AlbumItem from './AlbumItem'
import SongItem from './SongItem'
import ArtistItem from './ArtistItem'
import PlaylistItem from './PlaylistItem'
import { PlayerContext } from '../context/PlayerContext'

const DisplayHome = () => {
    const {songsData, albumsData, artistsData, playlistsData} = useContext(PlayerContext);

  return (
    <>
        <Navbar showNavigation={true} />
        <div className='mb-4'>
            <h1 className='my-5 font-bold text-2xl'>Feature Charts</h1>
            <div className='flex overflow-auto'>
                {albumsData.map((item, index)=>(<AlbumItem key={index} name={item.name} desc={item.desc} id={item._id} image={item.image}/>))}
            </div>
        </div>
        <div className='mb-4'>
            <h1 className='my-5 font-bold text-2xl'>Today's biggest hits</h1>
            <div className='flex overflow-auto'>
                {songsData.map((item, index)=>(<SongItem key={index} name={item.name} artist={item.artistName || item.artist} id={item._id} image={item.image}/>))}
            </div>
        </div>
        <div className='mb-4'>
            <h1 className='my-5 font-bold text-2xl'>Popular Artists</h1>
            <div className='flex overflow-auto'>
                {artistsData.map((artist, index)=>(<ArtistItem key={index} id={artist._id} name={artist.name} image={artist.image} />))}
            </div>
        </div>

        {playlistsData.length > 0 && (
            <div className='mb-4'>
                <h1 className='my-5 font-bold text-2xl'>Popular Playlists</h1>
                <div className='flex overflow-auto gap-4'>
                    {playlistsData.map((playlist, index) => (
                        <div key={index} className='min-w-[180px] w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26]'>
                            <PlaylistItem playlist={playlist} />
                        </div>
                    ))}
                </div>
            </div>
        )}
    </>
  )
}

export default DisplayHome