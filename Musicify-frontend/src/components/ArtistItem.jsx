import React from 'react';
import { useNavigate } from 'react-router-dom';

const ArtistItem = ({ id, name, image }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/artist/${id}`)}
      className='min-w-[180px] w-[180px] p-2 px-3 rounded cursor-pointer hover:bg-[#ffffff26] flex flex-col items-center'
    >
      <div className='w-[150px] h-[150px] overflow-hidden rounded-full'>
        <img
          className='w-full h-full object-cover'
          src={image}
          alt={name}
        />
      </div>
      <p className='font-bold mt-4 mb-1 truncate text-center w-full'>{name}</p>
      <p className='text-slate-200 text-sm truncate text-center'>Artist</p>
    </div>
  );
};

export default ArtistItem;
