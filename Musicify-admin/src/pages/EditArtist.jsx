import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom';
import { assets } from '../assets/admin-assets/assets'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';

const EditArtist = () => {
  // Get id from URL params instead of props
  const { id } = useParams();
  const navigate = useNavigate();

  const [image, setImage] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [color, setColor] = useState('#121212');
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState([]);

  // Fetch artist data when component mounts
  useEffect(() => {
    const fetchArtistData = async () => {
      setLoading(true);
      try {
        const response = await axios.get(`${url}/api/artist/list`);
        if (response.data.success) {
          const artistData = response.data.artists.find(artist => artist._id === id);
          if (artistData) {
            setName(artistData.name);
            setColor(artistData.bgColor);
            setImageUrl(artistData.image);

            // Fetch genre names if artist has genres
            if (artistData.genres && artistData.genres.length > 0) {
              try {
                const genreResponse = await axios.get(`${url}/api/genre/list`);
                if (genreResponse.data.success) {
                  const genreMap = {};
                  genreResponse.data.genres.forEach(genre => {
                    genreMap[genre._id] = genre.name;
                  });

                  // Map genre IDs to names
                  const genreNames = artistData.genres
                    .map(genreId => genreMap[genreId] || null)
                    .filter(name => name !== null);

                  setGenres(genreNames);
                }
              } catch (error) {
                console.error("Error fetching genre data:", error);
              }
            }
          } else {
            toast.error("Artist not found");
            navigate('/list-artist');
          }
        } else {
          toast.error("Failed to fetch artist data");
          navigate('/list-artist');
        }
      } catch (error) {
        console.error("Error fetching artist data:", error);
        toast.error("Error occurred while fetching artist data");
        navigate('/list-artist');
      }
      setLoading(false);
    };

    fetchArtistData();
  }, [id, navigate]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();

      formData.append('id', id);
      formData.append('name', name);
      formData.append('bgColor', color);

      // Only append image if a new one is selected
      if (image) {
        formData.append('image', image);
      }

      const response = await axios.post(`${url}/api/artist/update`, formData);

      if (response.data.success) {
        toast.success("Artist Updated Successfully");
        navigate('/list-artist');
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
      console.error("Error updating artist:", error);
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
      <h2 className="text-xl font-bold mb-6">Edit Artist</h2>
      <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>
        <div className='flex flex-col gap-4'>
          <p>Upload Image</p>
          <input onChange={(e) => setImage(e.target.files[0])} type="file" id="image" accept='image/*' hidden />
          <label htmlFor="image">
            <img
              className='w-24 h-24 rounded-full object-cover cursor-pointer'
              src={image instanceof File ? URL.createObjectURL(image) : (imageUrl || assets.upload_area)}
              alt=""
            />
          </label>
          {imageUrl && !image && <p className="text-xs text-gray-500">Current image will be kept if no new image is selected</p>}
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

        {genres.length > 0 && (
          <div className='flex flex-col gap-2.5'>
            <p>Genres (automatically populated from songs)</p>
            <div className='flex flex-wrap gap-2 mb-2'>
              {genres.map((genre, index) => (
                <div key={index} className='bg-green-100 text-green-800 px-2 py-1 rounded'>
                  {genre}
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Note: Genres are automatically added when songs by this artist are created or updated.
            </p>
          </div>
        )}
        <div className="flex gap-4">
          <button type='submit' className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>UPDATE</button>
          <button
            type='button'
            onClick={() => navigate('/list-artist')}
            className='text-base bg-gray-500 text-white py-2.5 px-14 cursor-pointer'
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditArtist;
