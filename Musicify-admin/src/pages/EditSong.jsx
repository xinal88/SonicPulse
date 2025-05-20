import React, { useEffect, useState } from 'react'
import { assets } from '../assets/admin-assets/assets'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import { isDuplicateGenre } from '../utils/genreUtils';
import { FaYoutube } from 'react-icons/fa';

const EditSong = () => {
  // Get id from URL params instead of props
  const { id } = useParams();
  const navigate = useNavigate();
  
  // Initialize state with localStorage values if available
  const [image, setImage] = useState(false);
  const [song, setSong] = useState(false);
  const [lrcFile, setLrcFile] = useState(false);
  const [name, setName] = useState("");
  const [selectedArtists, setSelectedArtists] = useState([]);
  const [album, setAlbum] = useState("none");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [albumData, setAlbumData] = useState([]);
  const [artistData, setArtistData] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [newGenre, setNewGenre] = useState("");
  const [newGenres, setNewGenres] = useState([]);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [useAlbumImage, setUseAlbumImage] = useState(false);

  // Fetch song and album data when component mounts
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch song data
        const songResponse = await axios.get(`${url}/api/song/list`);
        if (songResponse.data.success) {
          const songData = songResponse.data.songs.find(song => song._id === id);
          if (songData) {
            // Only set these values if they're not already in localStorage
            if (!localStorage.getItem(`editSong_${id}_name`)) {
              setName(songData.name);
            }
            
            if (!localStorage.getItem(`editSong_${id}_selectedArtists`)) {
              // Handle artist data - could be string or array
              if (songData.artist) {
                if (Array.isArray(songData.artist)) {
                  setSelectedArtists(songData.artist);
                } else {
                  // For backward compatibility with songs that have a single artist
                  setSelectedArtists([songData.artist]);
                }
              }
            }
            
            if (!localStorage.getItem(`editSong_${id}_album`)) {
              setAlbum(songData.album);
            }
            
            if (!localStorage.getItem(`editSong_${id}_imageUrl`)) {
              setImageUrl(songData.image);
            }
            
            if (!localStorage.getItem(`editSong_${id}_selectedGenres`)) {
              // Set selected genres if they exist
              if (songData.genres && Array.isArray(songData.genres)) {
                console.log("Song has genres:", songData.genres);
                setSelectedGenres(songData.genres);
              } else {
                console.log("Song has no genres or genres is not an array:", songData.genres);
              }
            }
            
            if (!localStorage.getItem(`editSong_${id}_youtubeUrl`) && songData.youtubeUrl) {
              setYoutubeUrl(songData.youtubeUrl);
            }
          } else {
            toast.error("Song not found");
            navigate('/list-song');
          }
        } else {
          toast.error("Failed to fetch song data");
          navigate('/list-song');
        }

        // Fetch album data for dropdown
        const albumResponse = await axios.get(`${url}/api/album/list`);
        if (albumResponse.data.success) {
          setAlbumData(albumResponse.data.albums);
        } else {
          toast.error("Unable to load albums data");
        }

        // Fetch artist data for dropdown
        const artistResponse = await axios.get(`${url}/api/artist/list`);
        if (artistResponse.data.success) {
          setArtistData(artistResponse.data.artists);
        } else {
          toast.error("Unable to load artists data");
        }

        // Fetch genre data for dropdown
        const genreResponse = await axios.get(`${url}/api/genre/list`);
        if (genreResponse.data.success) {
          console.log("Loaded genres:", genreResponse.data.genres);
          setGenreData(genreResponse.data.genres);
        } else {
          console.error("Failed to load genres:", genreResponse.data);
          toast.error("Unable to load genres data");
        }
      } catch (error) {
        console.error("Error fetching data:", error);
        toast.error("Error occurred while fetching data");
        navigate('/list-song');
      }
      setLoading(false);
    };

    fetchData();
  }, [id, navigate]);

  // Helper function to get album ID by name
  const getAlbumIdByName = (albumName) => {
    const album = albumData.find(album => album.name === albumName);
    return album ? album._id : null;
  }

  // Handle artist selection
  const handleArtistSelect = (e) => {
    const artistId = e.target.value;
    if (artistId && !selectedArtists.includes(artistId)) {
      setSelectedArtists([...selectedArtists, artistId]);
    }
  }

  // Remove a selected artist
  const removeArtist = (artistId) => {
    setSelectedArtists(selectedArtists.filter(id => id !== artistId));
  }

  // Get artist name by ID
  const getArtistName = (artistId) => {
    const artist = artistData.find(a => a._id === artistId);
    return artist ? artist.name : "";
  }

  // Handle genre selection
  const handleGenreSelect = (e) => {
    const genreId = e.target.value;
    if (genreId && !selectedGenres.includes(genreId)) {
      setSelectedGenres([...selectedGenres, genreId]);
    }
  }

  // Remove a selected genre
  const removeGenre = (genreId) => {
    setSelectedGenres(selectedGenres.filter(id => id !== genreId));
  }

  // Add a new genre with validation
  const addNewGenre = () => {
    const trimmedGenre = newGenre.trim();

    if (!trimmedGenre) {
      return; // Don't add empty genres
    }

    // Check for duplicates using our utility function
    const duplicateCheck = isDuplicateGenre(trimmedGenre, genreData, newGenres);

    if (duplicateCheck.isDuplicate) {
      // Show appropriate error message based on where the duplicate was found
      if (duplicateCheck.isExisting) {
        toast.error(`Genre "${duplicateCheck.duplicateName}" already exists in the system`);
      } else {
        toast.error(`You've already added "${duplicateCheck.duplicateName}" to the new genres list`);
      }
      return;
    }

    // No duplicates found, add the new genre
    setNewGenres([...newGenres, trimmedGenre]);
    setNewGenre("");
  }

  // Remove a new genre
  const removeNewGenre = (genre) => {
    setNewGenres(newGenres.filter(g => g !== genre));
  }

  // Get genre name by ID
  const getGenreName = (genreId) => {
    const genre = genreData.find(g => g._id === genreId);
    return genre ? genre.name : "";
  }

  // Effect to reset image when useAlbumImage changes
  useEffect(() => {
    if (useAlbumImage) {
      setImage(false);
    }
  }, [useAlbumImage]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    // Validate that at least one artist is selected
    if (selectedArtists.length === 0) {
      toast.error("Please select at least one artist");
      setLoading(false);
      return;
    }
    
    try {
      // If YouTube URL is provided, fetch details first
      if (youtubeUrl) {
        try {
          toast.info("Fetching details from YouTube...");
          const ytResponse = await axios.post(`${url}/api/song/download`, { youtubeUrl });
          
          // If no name is provided, use the one from YouTube
          if (!name && ytResponse.data.title) {
            setName(ytResponse.data.title);
          }
          
          // If no artists are selected and YouTube provides an artist, try to match
          if (selectedArtists.length === 0 && ytResponse.data.artist) {
            const artistName = ytResponse.data.artist;
            const existingArtist = artistData.find(
              a => a.name.toLowerCase() === artistName.toLowerCase()
            );
            
            if (existingArtist) {
              setSelectedArtists([existingArtist._id]);
            }
          }
          
          toast.success("YouTube details fetched successfully");
        } catch (error) {
          console.error("Error fetching from YouTube:", error);
          toast.error("Failed to fetch details from YouTube. Continuing with update.");
          // Continue with song update even if YouTube fetch fails
        }
      }
      
      const formData = new FormData();
      formData.append('id', id);
      formData.append('name', name);

      // Append each selected artist ID
      selectedArtists.forEach(artistId => {
        formData.append('artists', artistId);
      });

      formData.append('album', album);

      // If using album image, send a flag to the backend
      if (useAlbumImage && album !== "none") {
        formData.append('useAlbumImage', 'true');
        formData.append('albumId', getAlbumIdByName(album));
      }
      // Only append image if new one is selected and not using album image
      else if (image) {
        formData.append('image', image);
      }

      if (song) {
        formData.append('audio', song);
      }
      if (lrcFile) {
        formData.append('lrc', lrcFile);
      }

      if (youtubeUrl) {
        formData.append('youtubeUrl', youtubeUrl);
        formData.append('generateFingerprint', 'true');
      }

      // Add genres
      console.log("Sending selected genres:", selectedGenres);
      selectedGenres.forEach(genreId => {
        formData.append('genres', genreId);
      });

      // Add new genres
      console.log("Sending new genres:", newGenres);
      newGenres.forEach(genre => {
        formData.append('newGenres', genre);
      });

      const response = await axios.post(`${url}/api/song/update`, formData);

      if (response.data.success) {
        toast.success("Song Updated");
        // Clear localStorage after successful update
        clearStoredFormData();
        navigate('/list-song');
      } else {
        toast.error("Something went wrong");
      }
    } catch (error) {
      console.error("Error updating song:", error);
      toast.error("Error occurred");
    }
    setLoading(false);
  };

  // Clear stored form data
  const clearStoredFormData = () => {
    localStorage.removeItem(`editSong_${id}_name`);
    localStorage.removeItem(`editSong_${id}_selectedArtists`);
    localStorage.removeItem(`editSong_${id}_album`);
    localStorage.removeItem(`editSong_${id}_imageUrl`);
    localStorage.removeItem(`editSong_${id}_selectedGenres`);
    localStorage.removeItem(`editSong_${id}_youtubeUrl`);
  };

  return loading ? (
    <div className='grid place-items-center min-h-[80vh]'>
      <div className='w-16 h-16 place-self-center border-4 border-gray-400 border-t-green-800 rounded-full animate-spin'>
      </div>
    </div>
  ) : (
    <div>
      <h2 className="text-xl font-bold mb-6">Edit Song</h2>
      <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600'>
        <div className='flex gap-8'>
          <div className='flex flex-col gap-4'>
            <p>Upload song</p>
            <input onChange={(e) => setSong(e.target.files[0])} type="file" id='song' accept='audio/*' hidden />
            <label htmlFor="song">
              <img src={song ? assets.upload_added : assets.upload_song} className='w-24 cursor-pointer' alt="" />
            </label>
            {!song && <p className="text-xs text-gray-500">Current audio will be kept if no new file is selected</p>}
          </div>
          <div className='flex flex-col gap-4'>
            <p>Upload Image</p>
            <input
              onChange={(e) => setImage(e.target.files[0])}
              type="file"
              id='image'
              accept='image/*'
              hidden
              disabled={useAlbumImage}
            />
            <label htmlFor="image" className={useAlbumImage ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}>
              <img
                src={image instanceof File ? URL.createObjectURL(image) : (imageUrl || assets.upload_area)}
                className='w-24'
                alt=""
              />
              {useAlbumImage && album !== "none" && (
                <div className="text-xs text-green-600 mt-1 text-center">Using album image</div>
              )}
            </label>
            {imageUrl && !image && !useAlbumImage &&
              <p className="text-xs text-gray-500">Current image will be kept if no new image is selected</p>
            }
          </div>
          <div className='flex flex-col gap-4'>
            <p>Upload Lyrics (LRC)</p>
            <input onChange={(e) => setLrcFile(e.target.files[0])} type="file" id='lrc' accept='.lrc' hidden />
            <label htmlFor="lrc">
              <div className={`w-24 h-24 flex items-center justify-center border-2 ${lrcFile ? 'border-green-600 bg-green-100' : 'border-gray-300'} rounded cursor-pointer`}>
                <span className={`text-sm ${lrcFile ? 'text-green-600' : 'text-gray-500'}`}>
                  {lrcFile ? 'LRC Added' : 'LRC File'}
                </span>
              </div>
            </label>
            <p className="text-xs text-gray-500">Current LRC file will be kept if no new file is selected</p>
          </div>
        </div>
        <div className='flex flex-col gap-2.5 w-full'>
          <p>YouTube URL (optional)</p>
          <div className='flex items-center border-2 border-gray-400 focus-within:border-green-600'>
            <span className='px-2 text-red-600'><FaYoutube size={24} /></span>
            <input 
              onChange={(e) => setYoutubeUrl(e.target.value)} 
              value={youtubeUrl} 
              className='bg-transparent outline-none p-2.5 flex-grow' 
              placeholder='https://www.youtube.com/watch?v=...' 
              type="text"
            />
          </div>
          <p className='text-xs text-gray-500'>Enter a YouTube URL to automatically fetch song details when updating</p>
        </div>
        <div className='flex flex-col gap-2.5'>
          <p>Song name</p>
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250vw)]'
            placeholder='Type Here'
            type="text"
            required
          />
        </div>
        <div className='flex flex-col gap-2.5'>
          <p>Artists</p>
          <div className='flex flex-wrap gap-2 mb-2'>
            {selectedArtists.map((artistId) => (
              <div key={artistId} className='bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1'>
                <span>{getArtistName(artistId)}</span>
                <button
                  type="button"
                  onClick={() => removeArtist(artistId)}
                  className='text-red-500 font-bold'
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <select
            onChange={handleArtistSelect}
            value=""
            className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)]'
          >
            <option value="">Select Artist</option>
            {artistData.map((item, index) => (
              <option
                key={index}
                value={item._id}
                disabled={selectedArtists.includes(item._id)}
              >
                {item.name}
              </option>
            ))}
          </select>
        </div>
        <div className='flex flex-col gap-2.5'>
          <p>Album</p>
          <select
            onChange={(e) => {
              setAlbum(e.target.value);
              // If "none" is selected, disable useAlbumImage
              if (e.target.value === "none") {
                setUseAlbumImage(false);
              }
            }}
            value={album}
            className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[150px]'
          >
            <option value="none">None</option>
            {albumData.map((item, index) => (
              <option key={index} value={item.name}>{item.name}</option>
            ))}
          </select>

          {album !== "none" && (
            <div className="mt-2 flex items-center">
              <input
                type="checkbox"
                id="useAlbumImage"
                checked={useAlbumImage}
                onChange={(e) => setUseAlbumImage(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="useAlbumImage" className="text-sm cursor-pointer">
                Use album image for this song
              </label>
            </div>
          )}
        </div>
        <div className='flex flex-col gap-2.5'>
          <p>Genres</p>
          <div className='flex flex-wrap gap-2 mb-2'>
            {selectedGenres.map((genreId) => (
              <div key={genreId} className='bg-green-100 text-green-800 px-2 py-1 rounded flex items-center gap-1'>
                <span>{getGenreName(genreId)}</span>
                <button
                  type="button"
                  onClick={() => removeGenre(genreId)}
                  className='text-red-500 font-bold'
                >
                  ×
                </button>
              </div>
            ))}
            {newGenres.map((genre) => (
              <div key={genre} className='bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1'>
                <span>{genre} (new)</span>
                <button
                  type="button"
                  onClick={() => removeNewGenre(genre)}
                  className='text-red-500 font-bold'
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          <select
            onChange={handleGenreSelect}
            value=""
            className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250px)] mb-2'
          >
            <option value="">Select Genre</option>
            {genreData.map((item) => (
              <option
                key={item._id}
                value={item._id}
                disabled={selectedGenres.includes(item._id)}
              >
                {item.name}
              </option>
            ))}
          </select>

          <div className='flex gap-2 items-center'>
            <input
              type="text"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              placeholder="Add new genre"
              className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 flex-grow'
            />
            <button
              type="button"
              onClick={addNewGenre}
              className='bg-green-600 text-white px-4 py-2.5'
              disabled={!newGenre.trim()}
            >
              Add
            </button>
          </div>
        </div>

        <div className="flex gap-4">
          <button type="submit" className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>UPDATE</button>
          <button
            type='button'
            onClick={() => navigate('/list-song')}
            className='text-base bg-gray-500 text-white py-2.5 px-14 cursor-pointer'
          >
            CANCEL
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditSong;
