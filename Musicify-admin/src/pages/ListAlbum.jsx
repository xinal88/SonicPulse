import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';
import { assets } from '../assets/admin-assets/assets';
import { FaSearch, FaTrash, FaEdit } from 'react-icons/fa';

const ListAlbum = () => {
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState(null);
  const [songCount, setSongCount] = useState(0);
  const navigate = useNavigate();

  const fetchAlbums = async (search = '') => {
    try {
      const response = await axios.get(`${url}/api/album/list`, {
        params: { search }
      });

      if (response.data.success) {
        setData(response.data.albums);
      }
    } catch (error) {
      toast.error('Error occurred');
    }
  }

  const handleSearch = (e) => {
    e.preventDefault();
    fetchAlbums(searchTerm);
  }

  // Initial check before deleting album
  const initiateAlbumDelete = async (id, albumName) => {
    try {
      // First check how many songs will be deleted
      const response = await axios.post(`${url}/api/album/remove`, {
        id,
        albumName,
        confirmed: false
      });

      if (response.data.success && response.data.requiresConfirmation) {
        // Show confirmation dialog
        setAlbumToDelete({id, name: albumName});
        setSongCount(response.data.songCount);
        setShowConfirmation(true);
      } else if (response.data.success) {
        // No songs to delete, proceed directly
        await confirmAlbumDelete(id);
      } else {
        toast.error(response.data.message || "Failed to check album");
      }
    } catch (error) {
      console.error("Error checking album:", error);
      toast.error("Error occurred while checking album");
    }
  }

  // Confirm and actually delete the album
  const confirmAlbumDelete = async (id) => {
    try {
      const response = await axios.post(`${url}/api/album/remove`, {
        id,
        confirmed: true
      });

      if (response.data.success) {
        toast.success(response.data.message);
        await fetchAlbums();
      } else {
        toast.error(response.data.message || "Failed to delete album");
      }
    } catch (error) {
      console.error("Error deleting album:", error);
      toast.error("Error occurred while deleting album");
    }

    // Close the confirmation dialog
    setShowConfirmation(false);
    setAlbumToDelete(null);
  }

  // Cancel album deletion
  const cancelAlbumDelete = () => {
    setShowConfirmation(false);
    setAlbumToDelete(null);
  }

  useEffect(() => {
    fetchAlbums();
  },[])

  return (
    <div>
      {/* Confirmation Dialog */}
      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full">
            <h3 className="text-xl font-bold mb-4 text-red-600">Confirm Album Deletion</h3>
            <p className="mb-6">
              Are you sure you want to delete the album <strong>{albumToDelete?.name}</strong>?
              {songCount > 0 ? (
                <span className="block mt-2 text-red-500 font-semibold">
                  This will also delete {songCount} song{songCount !== 1 ? 's' : ''} associated with this album!
                </span>
              ) : (
                <span className="block mt-2">This album has no songs associated with it.</span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelAlbumDelete}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmAlbumDelete(albumToDelete.id)}
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 flex items-center gap-2"
              >
                <FaTrash size={14} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-4">
        <div>
          <p className="text-xl font-semibold">All albums list</p>
          <p className="text-sm text-gray-600 mt-1">Total: {data.length} albums</p>
        </div>
        <form onSubmit={handleSearch} className="flex items-center">
          <input
            type="text"
            placeholder="Search by album name or description"
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
        <div className='sm:grid hidden grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5 bg-gray-100'>
          <b>Image</b>
          <b>Name</b>
          <b>Description</b>
          <b>Album Color</b>
          <b>Edit</b>
          <b>Delete</b>
        </div>
        {data.map((item, index) => {
          return (
            <div key={index} className='grid grid-cols-[1fr_1fr_1fr] sm:grid-cols-[0.5fr_1fr_2fr_1fr_0.5fr_0.5fr] items-center gap-2.5 p-3 border border-gray-300 text-sm mr-5'>
              <img src={item.image} className='w-12' alt="" />
              <p>{item.name}</p>
              <p>{item.desc}</p>
              <input type="color" value={item.bgColor} readOnly />
              <button 
                onClick={() => navigate(`/edit-album/${item._id}`)} 
                className='bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 flex items-center gap-1 justify-center'
              >
                <FaEdit size={14} />
                <span>Edit</span>
              </button>
              <button
                onClick={() => initiateAlbumDelete(item._id, item.name)}
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

export default ListAlbum
