import React, { useState } from 'react'
import { assets } from '../assets/admin-assets/assets'
import { url } from '../App';
import { toast } from 'react-toastify';
import axios from 'axios';

const AddArtist = () => {
  const [image, setImage] = useState(false);
  const [color, setColor] = useState('#121212');
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('name', name);
      formData.append('image', image);
      formData.append('bgColor', color);

      const response = await axios.post(`${url}/api/artist/add`, formData);

      if (response.data.success) {
        toast.success("Artist Added Successfully");
        setName("");
        setImage(false);
        setColor('#121212');
      } else {
        // Check for specific error messages
        if (response.data.isDuplicate) {
          toast.error("An artist with this name already exists");
        } else if (response.data.message) {
          toast.error(response.data.message);
        } else {
          toast.error("Something went wrong");
        }
      }
    } catch (error) {
      console.log(error);
      toast.error("Error occurred")
    }

    setLoading(false);
  }

  return loading ? (
    <div className='grid place-items-center min-h-[80vh]'>
      <div className='w-16 h-16 place-self-center border-4 border-gray-400 border-t-green-800 rounded-full animate-spin'>
      </div>
    </div>
  ) : (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>
      <div className='flex flex-col gap-4'>
        <p>Upload Image</p>
        <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" accept='image/*' hidden />
        <label htmlFor="image">
          <img className='w-24 cursor-pointer' src={image instanceof File ? URL.createObjectURL(image) : assets.upload_area} alt="" />
        </label>
      </div>
      <div className='flex flex-col gap-2.5'>
        <p>Artist name</p>
        <input
          onChange={(e) => setName(e.target.value)}
          value={name}
          type="text"
          placeholder='Type here'
          className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)]'
        />
      </div>
      <div className='flex flex-col gap-3'>
        <p>Theme Color</p>
        <input onChange={(e) => setColor(e.target.value)} value={color} type="color" />
      </div>

      <div className='flex flex-col gap-2.5'>
        <p>Genres</p>
        <p className="text-xs text-gray-500">
          Genres will be automatically added to this artist when songs by this artist are created or updated.
        </p>
      </div>

      <button type='submit' className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>ADD</button>
    </form>
  )
}

export default AddArtist
