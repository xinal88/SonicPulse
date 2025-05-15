import React, { useContext } from 'react'
import { PlayerContext } from '../context/PlayerContext'

const SongItem = ({name, image, artist, id}) => { // Changed from desc to artist

    const {playWithId} = useContext(PlayerContext)

  return (
    <div onClick={()=>playWithId(id)} className='min-w-[180px] w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26]'>
        <div className='w-full h-[180px] overflow-hidden'>
            <img className='rounded w-full h-full object-cover' src={image} alt="" />
        </div>
        <p className='font-bold mt-2 mb-1 truncate'>{name}</p>
        <p className='text-slate-200 text-sm truncate'>{artist}</p> {/* Changed from desc to artist */}
    </div>
  )
}

export default SongItem