import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { assets } from '../assets/admin-assets/assets'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';

const EditAlbum = () => {
  // Get id from URL params instead of props
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [image, setImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [color, setColor] = useState('#121212');
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  // Fetch album data when component mounts
  useEffect(() => {
    const fetchAlbumData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${url}/api/album/list`);
        if (response.data.success) {
          const albumData = response.data.albums.find(album => album._id === id);
          if (albumData) {
            setName(albumData.name);
            setDesc(albumData.desc);
            setColor(albumData.bgColor);
            setImageUrl(albumData.image);
          } else {
            toast.error("Album not found");
            navigate('/list-album');
          }
        } else {
          toast.error("Failed to fetch album data");
          navigate('/list-album');
        }
      } catch (error) {
        console.error("Error fetching album data:", error);
        toast.error("Error occurred while fetching album data");
        navigate('/list-album');
      }
      setLoading(false);
    };

    fetchAlbumData();
  }, [id, navigate]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('id', id);
      formData.append('name', name);
      formData.append('desc', desc);
      formData.append('bgColor', color);
      
      // Only append image if a new one is selected
      if (image) {
        formData.append('image', image);
      }

      const response = await axios.post(`${url}/api/album/update`, formData);

      if (response.data.success) {
        toast.success("Album Updated");
        navigate('/list-album');
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error("Error updating album:", error);
      toast.error("Error occurred");
    }

    setLoading(false);
  };

  return loading ? (
    <div className='grid place-items-center min-h-[80vh]'>
      <div className='w-16 h-16 place-self-center border-4 border-gray-400 border-t-green-800 rounded-full animate-spin'>
      </div>
    </div>
  ) : (
    <div>
      <h2 className="text-xl font-bold mb-6">Edit Album</h2>
      <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>
        <div className='flex flex-col gap-4'>
          <p>Upload Image</p>
          <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" accept='image/*' hidden />
          <label htmlFor="image">
            <img 
              className='w-24 cursor-pointer' 
              src={image instanceof File ? URL.createObjectURL(image) : (imageUrl || assets.upload_area)} 
              alt="" 
            />
          </label>
          {imageUrl && !image && <p className="text-xs text-gray-500">Current image will be kept if no new image is selected</p>}
        </div>
        <div className='flex flex-col gap-2.5'>
          <p>Album name</p>
          <input 
            onChange={(e) => setName(e.target.value)} 
            value={name} 
            type="text" 
            placeholder='Type here' 
            className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)]' 
          />
        </div>
        <div className='flex flex-col gap-2.5'>
          <p>Album description</p>
          <input 
            onChange={(e) => setDesc(e.target.value)} 
            value={desc} 
            type="text" 
            placeholder='Type here' 
            className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)]' 
          />
        </div>
        <div className='flex flex-col gap-3'> 
          <p>Background Color</p>
          <input onChange={(e) => setColor(e.target.value)} value={color} type="color" />
        </div>
        <div className="flex gap-4">
          <button type='submit' className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>UPDATE</button>
          <button 
            type='button' 
            onClick={() => navigate('/list-album')} 
            className='text-base bg-gray-500 text-white py-2.5 px-14 cursor-pointer'
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAlbum;
