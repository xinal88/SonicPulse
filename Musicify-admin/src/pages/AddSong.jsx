import React, { useEffect, useState } from 'react'
import { assets } from '../assets/admin-assets/assets'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';


const AddSong = () => {

  const [image,setImage] = useState(false);
  const [song,setSong] = useState(false);
  const [lrcFile,setLrcFile] = useState(false);
  const [name,setName] = useState("");
  const [selectedArtists,setSelectedArtists] = useState([]); // Array of selected artist IDs
  const [album,setAlbum] = useState("none");
  const [useAlbumImage,setUseAlbumImage] = useState(false);
  const [loading,setLoading] = useState(false);
  const [albumData,setAlbumData] = useState([]);
  const [artistData,setArtistData] = useState([]);
  const [genreData,setGenreData] = useState([]);
  const [selectedGenres,setSelectedGenres] = useState([]);
  const [newGenre,setNewGenre] = useState("");
  const [newGenres,setNewGenres] = useState([]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Validate that either an image is uploaded or album image is used
    if (!image && !(useAlbumImage && album !== "none")) {
      toast.error("Please upload an image or use the album image");
      return;
    }

    // Validate that audio is uploaded
    if (!song) {
      toast.error("Please upload an audio file");
      return;
    }

    // Validate that at least one artist is selected
    if (selectedArtists.length === 0) {
      toast.error("Please select at least one artist");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);

      // Append each selected artist ID
      selectedArtists.forEach(artistId => {
        formData.append('artists', artistId);
      });

      // If using album image, send a flag to the backend
      if (useAlbumImage && album !== "none") {
        formData.append('useAlbumImage', 'true');
        formData.append('albumId', getAlbumIdByName(album));
      } else {
        // Otherwise, send the uploaded image
        formData.append('image', image);
      }

      formData.append('audio', song);
      formData.append('album', album);

      // Add LRC file if available
      if (lrcFile) {
        formData.append('lrc', lrcFile);
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

      const response = await axios.post(`${url}/api/song/add`, formData);

      if (response.data.success) {
        toast.success("Song Added");
        setName("");
        setSelectedArtists([]); // Reset selected artists
        setAlbum("none");
        setImage(false);
        setSong(false);
        setLrcFile(false);
        setUseAlbumImage(false);
        setSelectedGenres([]);
        setNewGenres([]);
        setNewGenre("");
      } else {
        toast.error("Something went wrong");
      }

    } catch (error) {
      console.log(error);
      toast.error("Error occured");
    }
    setLoading(false);
  }

  const loadData = async () => {
    try {
      // Load albums
      const albumResponse = await axios.get(`${url}/api/album/list`);
      if (albumResponse.data.success) {
        setAlbumData(albumResponse.data.albums);
      } else {
        toast.error("Unable to load albums data");
      }

      // Load artists
      const artistResponse = await axios.get(`${url}/api/artist/list`);
      if (artistResponse.data.success) {
        setArtistData(artistResponse.data.artists);
      } else {
        toast.error("Unable to load artists data");
      }

      // Load genres
      const genreResponse = await axios.get(`${url}/api/genre/list`);
      if (genreResponse.data.success) {
        console.log("Loaded genres:", genreResponse.data.genres);
        setGenreData(genreResponse.data.genres);
      } else {
        console.error("Failed to load genres:", genreResponse.data);
        toast.error("Unable to load genres data");
      }
    } catch (error) {
      toast.error("Error occurred loading data")
    }
  }

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

  // Add a new genre
  const addNewGenre = () => {
    if (newGenre.trim() && !newGenres.includes(newGenre.trim())) {
      setNewGenres([...newGenres, newGenre.trim()]);
      setNewGenre("");
    }
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

  useEffect(() => {
    loadData();
  },[])

  return loading ? (
    <div className='grid place-items-center min-h-[80vh]'>
      <div className='w-16 h-16 place-self-center border-4 border-gray-400 border-t-green-800 rounded-full animate-spin'>

      </div>
    </div>
  ) : (
    <form onSubmit={onSubmitHandler} className='flex flex-col items-start gap-8 text-gray-600' action="">
      <div className='flex gap-8'>
        <div className='flex flex-col gap-4'>
          <p>Upload song</p>
          <input onChange={(e) => setSong(e.target.files[0])} type="file" id='song' accept='audio/*' hidden/>
          <label htmlFor="song">
            <img src={song ? assets.upload_added : assets.upload_song} className='w-24 cursor-pointer' alt="" />
          </label>
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
              src={image instanceof File ? URL.createObjectURL(image) : assets.upload_area}
              className='w-24'
              alt=""
            />
            {useAlbumImage && album !== "none" && (
              <div className="text-xs text-green-600 mt-1 text-center">Using album image</div>
            )}
          </label>
        </div>
        <div className='flex flex-col gap-4'>
          <p>Upload Lyrics (LRC)</p>
          <input onChange={(e) => setLrcFile(e.target.files[0])} type="file" id='lrc' accept='.lrc' hidden/>
          <label htmlFor="lrc">
            <div className={`w-24 h-24 flex items-center justify-center border-2 ${lrcFile ? 'border-green-600 bg-green-100' : 'border-gray-300'} rounded cursor-pointer`}>
              <span className={`text-sm ${lrcFile ? 'text-green-600' : 'text-gray-500'}`}>
                {lrcFile ? 'LRC Added' : 'LRC File'}
              </span>
            </div>
          </label>
        </div>
      </div>
      <div className='flex flex-col gap-2.5'>
        <p>Song name</p>
        <input onChange={(e) => setName(e.target.value)} value={name} className='bg-transparent outline-green-600 border-2 border-gray-400 p-2.5 w-[max(40vw,250vw)]' placeholder='Type Here' type="text" required/>
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
          {albumData.map((item, index) => (<option key={index} value={item.name}>{item.name}</option>))}
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

      <button type="submit" className='text-base bg-black text-white py-2.5 px-14 cursor-pointer'>ADD</button>
    </form>
  )
}

export default AddSong