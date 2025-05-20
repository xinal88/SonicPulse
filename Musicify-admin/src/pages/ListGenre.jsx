import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';
import { assets } from '../assets/admin-assets/assets';
import { FaSearch, FaTrash, FaEdit, FaSave, FaTimes } from 'react-icons/fa';

const ListGenre = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingGenre, setEditingGenre] = useState(null);
  const [newGenreName, setNewGenreName] = useState('');
  const navigate = useNavigate();

  const fetchGenres = async (search = '') => {
    try {
      // Include song counts in the response
      const response = await axios.get(`${url}/api/genre/list`, {
        params: {
          includeCounts: 'true',
          search
        }
      });

      if (response.data.success) {
        setData(response.data.genres);
      }
    } catch (error) {
      toast.error('Error occurred while fetching genres');
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    fetchGenres(searchTerm);
  }

  const startEditing = (genre) => {
    setEditingGenre(genre);
    setNewGenreName(genre.name);
  }

  const cancelEditing = () => {
    setEditingGenre(null);
    setNewGenreName('');
  }

  const updateGenre = async (id) => {
    try {
      if (!newGenreName.trim()) {
        toast.error('Genre name cannot be empty');
        return;
      }

      const response = await axios.post(`${url}/api/genre/update`, {
        id,
        name: newGenreName
      });

      if (response.data.success) {
        toast.success(response.data.message);
        setEditingGenre(null);
        setNewGenreName('');
        await fetchGenres();
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      toast.error('Error occurred while updating genre');
    }
  }

  const removeGenre = async (id) => {
    try {
      // Get the genre to show in confirmation message
      const genre = data.find(g => g._id === id);

      if (!window.confirm(`Are you sure you want to remove the genre "${genre.name}"? This will remove the genre from all songs but will not delete any songs.`)) {
        return;
      }

      const response = await axios.post(`${url}/api/genre/remove`, { id });

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchGenres();
      } else {
        toast.error('Failed to remove genre');
      }
    } catch (error) {
      toast.error('Error occurred while removing genre');
    }
  }

  useEffect(() => {
    fetchGenres();
  }, []);

  // Filter data based on search term
  const filteredData = data.filter(genre =>
    genre.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className='text-3xl font-bold'>List of Genres</h1>
        <p className="text-sm text-gray-600 mt-1">Total: {data.length} genres</p>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} className='flex items-center gap-2 mb-5'>
        <div className='relative flex-1'>
          <input
            type="text"
            placeholder='Search by genre name'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className='w-full p-2 border border-gray-300 rounded'
          />
          <FaSearch className='absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400' />
        </div>
        <button type='submit' className='bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600'>
          Search
        </button>
      </form>

      {/* Table header */}
      <div className='sm:grid hidden grid-cols-[2fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100'>
        <b>Name</b>
        <b>Songs Count</b>
        <b>Edit</b>
        <b>Delete</b>
      </div>

      {/* Table rows */}
      {filteredData.map((item, index) => {
        return (
          <div key={index} className='grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[2fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5'>
            {editingGenre && editingGenre._id === item._id ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newGenreName}
                  onChange={(e) => setNewGenreName(e.target.value)}
                  className="p-1 border border-gray-300 rounded flex-1"
                />
                <button
                  onClick={() => updateGenre(item._id)}
                  className="bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                >
                  Save
                </button>
                <button
                  onClick={cancelEditing}
                  className="bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <p>{item.name}</p>
            )}
            <p>{item.songCount || 0}</p>
            <button
              onClick={() => startEditing(item)}
              className='bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600'
              disabled={editingGenre !== null}
            >
              Edit
            </button>
            <button
              onClick={() => removeGenre(item._id)}
              className='bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600'
              disabled={editingGenre !== null}
            >
              Delete
            </button>
          </div>
        );
      })}

      {/* No genres message */}
      {filteredData.length === 0 && (
        <div className="text-center p-5 bg-gray-100 rounded mt-5">
          <p>No genres found</p>
        </div>
      )}
    </div>
  );
}

export default ListGenre;
