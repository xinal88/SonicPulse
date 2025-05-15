import axios from 'axios';
import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify';
import { url } from '../App';
import { useNavigate } from 'react-router-dom';

const ListArtist = () => {
  const [data, setData] = useState([]);
  const navigate = useNavigate();
  
  const fetchArtists = async () => {
    try {
      const response = await axios.get(`${url}/api/artist/list`);

      if (response.data.success) {
        setData(response.data.artists);
      }
    } catch (error) {
      toast.error('Error occurred');
    }
  }

  const removeArtist = async (id) => {
    try {
      const response = await axios.post(`${url}/api/artist/remove`, {id});

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchArtists();
      }
    } catch (error) {
      toast.error("Error occurred");
    }
  }

  useEffect(() => {
    fetchArtists();
  }, [])

  return (
    <div>
      <p>All artists list</p>
      <br />
      <div>
        <div className='sm:grid hidden grid-cols-[0.5fr_1fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 br-gray-100'>
          <b>Image</b>
          <b>Name</b>
          <b>Theme Color</b>
          <b>Edit</b>
          <b>Delete</b>
        </div>
        {data.map((item, index) => {
          return (
            <div key={index} className='grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.5fr_1fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5'>
              <img src={item.image} className='w-12 h-12 rounded-full object-cover' alt="" />
              <p>{item.name}</p>
              <input type="color" value={item.bgColor} readOnly />
              <button 
                onClick={() => navigate(`/edit-artist/${item._id}`)} 
                className='bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600'
              >
                Edit
              </button>
              <button 
                onClick={() => removeArtist(item._id)} 
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

export default ListArtist
