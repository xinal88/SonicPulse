import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';
import { assets } from '../assets/admin-assets/assets';
import { FaSearch, FaTrash, FaEdit } from 'react-icons/fa';

const ListArtist = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const fetchArtists = async (search = '') => {
    try {
      const response = await axios.get(`${url}/api/artist/list`, {
        params: { search }
      });

      if (response.data.success) {
        setData(response.data.artists);
      }
    } catch (error) {
      toast.error('Error occurred');
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    fetchArtists(searchTerm);
  }

  const removeArtist = async (id) => {
    try {
      if (!window.confirm("Are you sure you want to delete this artist?")) {
        return;
      }
      
      console.log(`Attempting to delete artist with ID: ${id}`);
      const response = await axios.post(`${url}/api/artist/remove`, {id});

      console.log('Response from server:', response.data);

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchArtists();
      } else {
        // Check if the artist has songs
        if (response.data.hasSongs) {
          console.log(`Artist has ${response.data.songCount} songs, cannot delete`);
          toast.error(`Cannot delete artist because they have ${response.data.songCount} song(s) in the system. Please delete those songs first.`);
        } else {
          toast.error(response.data.message || "Failed to delete artist");
        }
      }
    } catch (error) {
      console.error("Error deleting artist:", error);
      toast.error("Error occurred");
    }
  }

  useEffect(() => {
    fetchArtists();
  }, [])

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-semibold">All artists list</p>
          <p className="text-sm text-gray-600 mt-1">Total: {data.length} artists</p>
        </div>
        <form onSubmit={handleSearch} className="flex items-center">
          <input
            type="text"
            placeholder="Search by artist name"
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
        <div className='sm:grid hidden grid-cols-[0.5fr_1fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100'>
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
                className='bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1 justify-center'
              >
                <FaEdit size={14} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => removeArtist(item._id)}
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

export default ListArtist
