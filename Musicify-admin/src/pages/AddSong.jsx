import React, { useEffect, useState } from 'react'
import { assets } from '../assets/admin-assets/assets'
import axios from 'axios';
import { url } from '../App';
import { toast } from 'react-toastify';
import { isDuplicateGenre } from '../utils/genreUtils';
import { FaYoutube, FaSpotify } from 'react-icons/fa';

const AddSong = () => {
  // Initialize state from localStorage if available
  const [song, setSong] = useState(false);
  const [image, setImage] = useState(false);
  const [useAlbumImage, setUseAlbumImage] = useState(
    localStorage.getItem('addSong_useAlbumImage') === 'true'
  );
  const [lrcFile, setLrcFile] = useState(false);
  const [spotifyUrl, setSpotifyUrl] = useState(localStorage.getItem('addSong_spotifyUrl') || "");
  const [name, setName] = useState(localStorage.getItem('addSong_name') || "");
  const [selectedArtists, setSelectedArtists] = useState(
    JSON.parse(localStorage.getItem('addSong_selectedArtists') || '[]')
  );
  const [album, setAlbum] = useState(localStorage.getItem('addSong_album') || "none");
  const [loading, setLoading] = useState(false);
  const [albumData, setAlbumData] = useState([]);
  const [artistData, setArtistData] = useState([]);
  const [genreData, setGenreData] = useState([]);
  const [selectedGenres, setSelectedGenres] = useState(
    JSON.parse(localStorage.getItem('addSong_selectedGenres') || '[]')
  );
  const [newGenre, setNewGenre] = useState("");
  const [newGenres, setNewGenres] = useState(
    JSON.parse(localStorage.getItem('addSong_newGenres') || '[]')
  );
  const [youtubeUrl, setYoutubeUrl] = useState(localStorage.getItem('addSong_youtubeUrl') || "");
  const [fetchingMetadata, setFetchingMetadata] = useState(false);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('addSong_name', name);
    localStorage.setItem('addSong_selectedArtists', JSON.stringify(selectedArtists));
    localStorage.setItem('addSong_album', album);
    localStorage.setItem('addSong_selectedGenres', JSON.stringify(selectedGenres));
    localStorage.setItem('addSong_newGenres', JSON.stringify(newGenres));
    localStorage.setItem('addSong_useAlbumImage', useAlbumImage.toString());
    localStorage.setItem('addSong_youtubeUrl', youtubeUrl);
    localStorage.setItem('addSong_spotifyUrl', spotifyUrl);
  }, [name, selectedArtists, album, selectedGenres, newGenres, useAlbumImage, youtubeUrl, spotifyUrl]);

  // Clear localStorage after successful submission
  const clearStoredFormData = () => {
    localStorage.removeItem('addSong_name');
    localStorage.removeItem('addSong_selectedArtists');
    localStorage.removeItem('addSong_album');
    localStorage.removeItem('addSong_selectedGenres');
    localStorage.removeItem('addSong_newGenres');
    localStorage.removeItem('addSong_youtubeUrl');
    localStorage.removeItem('addSong_spotifyUrl');
  };

  const onSubmitHandler = async (e) => {
    e.preventDefault();

    // Validate URLs - only one should be provided
    if (spotifyUrl && youtubeUrl) {
      toast.error("Please provide either a Spotify URL or a YouTube URL, not both");
      return;
    }

    // Validate that audio is uploaded if no Spotify URL is provided
    if (!spotifyUrl && !song) {
      toast.error("Please either upload an audio file or provide a Spotify URL");
      return;
    }

    // Validate that at least one artist is selected
    if (selectedArtists.length === 0) {
      toast.error("Please select at least one artist");
      return;
    }

    // Validate image if using YouTube URL
    if (youtubeUrl && !spotifyUrl && !image && !(useAlbumImage && album !== "none")) {
      toast.error("Please upload an image or use the album image when using YouTube URL");
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

      // Handle image for YouTube URL option
      if (youtubeUrl && !spotifyUrl) {
        if (useAlbumImage && album !== "none") {
          formData.append('useAlbumImage', 'true');
          formData.append('albumId', getAlbumIdByName(album));
        } else {
          formData.append('image', image);
        }
      }

      // If Spotify URL is provided, use it first
      if (spotifyUrl) {
        try {
          setFetchingMetadata(true);
          toast.info("Fetching details from Spotify...");
          formData.append('spotifyUrl', spotifyUrl);
          formData.append('generateFingerprint', 'true');  // Add fingerprint generation for Spotify URLs
          // The actual metadata fetching will happen on the backend
        } catch (error) {
          console.error("Error with Spotify URL:", error);
          toast.error("Failed to process Spotify URL");
          return;
        } finally {
          setFetchingMetadata(false);
        }
      }
      
      // Only append audio file if not using Spotify URL
      if (!spotifyUrl && song) {
        formData.append('audio', song);
      }

      // Add album name
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

      // If YouTube URL is provided and no Spotify URL, fetch details from YouTube
      if (youtubeUrl) {
        try {
          toast.info("Fetching details from YouTube...");
          console.log("Sending YouTube URL:", youtubeUrl);
          
          const ytResponse = await axios.post(`${url}/api/song/download`, { youtubeUrl });
          console.log("YouTube response:", ytResponse.data);
          
          if (ytResponse.data.success) {
            // If no name is provided, use the one from YouTube
            if (!name && ytResponse.data.title && ytResponse.data.title !== "Unknown Title") {
              setName(ytResponse.data.title);
            }
            
            // If no artists are selected and YouTube provides an artist, try to match
            if (selectedArtists.length === 0 && 
                ytResponse.data.artist && 
                ytResponse.data.artist !== "Unknown Artist") {
              const artistName = ytResponse.data.artist;
              const existingArtist = artistData.find(
                a => a.name.toLowerCase() === artistName.toLowerCase()
              );
              
              if (existingArtist) {
                setSelectedArtists([existingArtist._id]);
              }
            }
            
            toast.success("YouTube details fetched successfully");
          } else {
            toast.warning("YouTube details could not be fetched completely. Continuing with upload.");
          }
        } catch (error) {
          console.error("Error fetching from YouTube:", error);
          toast.error("Failed to fetch details from YouTube. Continuing with upload.");
          // Continue with song upload even if YouTube fetch fails
        }
      }


      // Add YouTube URL if provided
      if (youtubeUrl) {
        formData.append('youtubeUrl', youtubeUrl);
        formData.append('generateFingerprint', 'true');
      }

      const response = await axios.post(`${url}/api/song/add`, formData);

      if (response.data.success) {
        toast.success("Song Added");
        setName("");
        setSelectedArtists([]);
        setAlbum("none");
        setImage(false);
        setSong(false);
        setLrcFile(false);
        setUseAlbumImage(false);
        setSelectedGenres([]);
        setNewGenres([]);
        setNewGenre("");
        setYoutubeUrl("");
        setSpotifyUrl("");
        
        // Clear localStorage after successful submission
        clearStoredFormData();
      } else {
        // Check if error is specifically related to LRC file
        if (error?.response?.data?.message?.includes('LRC')) {
          toast.error(`LRC File Error: ${error.response.data.message}`);
        } else {
          toast.error("Something went wrong");
        }
      }

    } catch (error) {
      console.log(error);
      toast.error("Error occurred");
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
        {!spotifyUrl && (
          <div className='flex flex-col gap-4'>
            <p>Upload song</p>
            <input onChange={(e) => setSong(e.target.files[0])} type="file" id='song' accept='audio/*' hidden/>
            <label htmlFor="song">
              <img src={song ? assets.upload_added : assets.upload_song} className='w-24 cursor-pointer' alt="" />
            </label>
          </div>
        )}
        {/* Show image upload when Spotify URL is not being used */}
        {!spotifyUrl && (
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
        )}

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

      {/* YouTube URL input field - without separate fetch button */}
      <div className='flex flex-col gap-6 w-full'>
        <div className='text-sm text-gray-500 bg-gray-100 p-3 rounded'>
          You can add a song using either a Spotify track URL (recommended) or a YouTube URL.
          The system will automatically fetch the song details and audio.
        </div>

        {/* Spotify URL input field */}
        <div className='flex flex-col gap-2.5'>
          <p>Spotify Track URL (recommended)</p>
          <div className='flex items-center border-2 border-gray-400 focus-within:border-green-600'>
            <span className='px-2 text-green-600'><FaSpotify size={24} /></span>
            <input
              onChange={(e) => {
                setSpotifyUrl(e.target.value);
                if (e.target.value) setYoutubeUrl("");
              }}
              value={spotifyUrl}
              className='bg-transparent outline-none p-2.5 flex-grow'
              placeholder='https://open.spotify.com/track/...'
              type="text"
              disabled={fetchingMetadata}
            />
          </div>
          <p className='text-xs text-gray-500'>Enter a Spotify track URL to automatically fetch song details and audio</p>
        </div>

        {/* YouTube URL input field */}
        <div className='flex flex-col gap-2.5'>
          <p>YouTube URL (alternative)</p>
          <div className='flex items-center border-2 border-gray-400 focus-within:border-green-600'>
            <span className='px-2 text-red-600'><FaYoutube size={24} /></span>
            <input
              onChange={(e) => {
                setYoutubeUrl(e.target.value);
                if (e.target.value) setSpotifyUrl("");
              }}
              value={youtubeUrl}
              className='bg-transparent outline-none p-2.5 flex-grow'
              placeholder='https://www.youtube.com/watch?v=...'
              type="text"
              disabled={fetchingMetadata || spotifyUrl !== ""}
            />
          </div>
          <p className='text-xs text-gray-500'>Or enter a YouTube URL to fetch song details</p>
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
