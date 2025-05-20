import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';
import { assets } from '../assets/admin-assets/assets';
import { FaSearch, FaTrash, FaEdit } from 'react-icons/fa';

const ListSong = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchSongs = async (search = '') => {
    try {
      const response = await axios.get(`${url}/api/song/list`, {
        params: { search }
      });

      if (response.data.success) {
        setData(response.data.songs)
      }

    } catch (error) {
      toast.error("Error Occurred")
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    fetchSongs(searchTerm);
  }

  const removeSong = async (id) => {
    try {
      if (!window.confirm("Are you sure you want to delete this song?")) {
        return;
      }

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
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-semibold">All songs list</p>
          <p className="text-sm text-gray-600 mt-1">Total: {data.length} songs</p>
        </div>
        <form onSubmit={handleSearch} className="flex items-center">
          <input
            type="text"
            placeholder="Search by song, album, or artist"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-l px-3 py-2 focus:outline-none focus:ring-1 focus:ring-green-500 w-80 h-10"
          />
          <button
            type="submit"
            className="bg-green-600 text-white px-3 rounded-r hover:bg-green-700 flex items-center justify-center h-10"
          >
            <FaSearch className="text-lg" />
          </button>
        </form>
      </div>
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
                className='bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1 justify-center'
              >
                <FaEdit size={14} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => removeSong(item._id)}
                className='bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 flex items-center gap-1 justify-center'
              >
                <FaTrash size={14} />
                <span>Delete</span>
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default ListSong
