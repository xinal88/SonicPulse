import React, { useEffect, useState } from 'react'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';


const ListSong = () => {

  const [data, setData] = useState([]);
  const navigate = useNavigate();
  const fetchSongs = async () => {
    try {
      const response = await axios.get(`${url}/api/song/list`);

      if (response.data.success) {
        setData(response.data.songs)
      }

    } catch (error) {
      toast.error("Error Occured")
    }
  }

  const removeSong = async (id) => {
    try {

      const response = await axios.post(`${url}/api/song/remove`, {id});

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchSongs();
      }

    } catch (error) {
      toast.error("Error Occurred");
    }
  }

  useEffect(() => {
    fetchSongs();
  },[])

  return (
    <div>
      <p>All songs list</p>
      <br />
      <div>
        <div className='sm:grid hidden grid-cols-[0.5fr_1fr_1fr_2fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100'>
          <b>Image</b>
          <b>Name</b>
          <b>Artist</b>
          <b>Album</b>
          <b>Duration</b>
          <b>Edit</b>
          <b>Delete</b>
        </div>
        {data.map((item,index)=>{
          return (
            <div key={index} className='grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.5fr_1fr_1fr_2fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5'>
              <img className='w-12' src={item.image} alt="" />
              <p>{item.name}</p>
              <p>{item.artistName || item.artist}</p>
              <p>{item.album}</p>
              <p>{item.duration}</p>
              <button
                onClick={() => navigate(`/edit-song/${item._id}`)}
                className='bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600'
              >
                Edit
              </button>
              <button
                onClick={() => removeSong(item._id)}
                className='bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600'
              >
                Delete
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ListSong