import React, { useContext, useState, useEffect, useRef } from 'react'
import {assets} from '../assets/frontend-assets/assets'
import { useNavigate } from 'react-router-dom'
import { PlayerContext } from '../context/PlayerContext'

const Sidebar = () => {
    const navigate = useNavigate();
    const { setShowLyrics } = useContext(PlayerContext);
    const [searchTerm, setSearchTerm] = useState('');
    const [isSearchActive, setIsSearchActive] = useState(false);
    const searchInputRef = useRef(null);
    const searchContainerRef = useRef(null);

    const handleHomeClick = () => {
        // Close lyrics if they're open
        setShowLyrics(false);
        navigate('/');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchTerm.trim()) {
            navigate(`/search?q=${encodeURIComponent(searchTerm)}`);
        } else {
            navigate('/search');
        }
    };

    const activateSearch = () => {
        setIsSearchActive(true);
        // Focus the input after a short delay to ensure the element is visible
        setTimeout(() => {
            if (searchInputRef.current) {
                searchInputRef.current.focus();
            }
        }, 50);
    };

    // Handle clicks outside the search container
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchContainerRef.current &&
                !searchContainerRef.current.contains(event.target) &&
                isSearchActive) {
                setIsSearchActive(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSearchActive]);

    return (
        <div className='w-[25%] h-full p-2 flex-col gap-2 text-white hidden lg:flex'>
            <div className='bg-[#121212] h-[15%] rounded flex flex-col justify-around' style={{ minHeight: '120px' }}>
                <div onClick={handleHomeClick} className='flex items-center gap-3 pl-8 cursor-pointer h-[52px]'>
                    <img className='w-6' src={assets.home_icon} alt="" />
                    <p className='font-bold'>Home</p>
                </div>
                <div
                    ref={searchContainerRef}
                    className='flex items-center h-[52px] pl-6 pr-4 mx-2'
                >
                    {isSearchActive ? (
                        <form onSubmit={handleSearchSubmit} className='flex items-center w-full'>
                            <div className='relative flex items-center w-full'>
                                <button
                                    type="submit"
                                    className='absolute left-4 top-1/2 transform -translate-y-1/2 cursor-pointer hover:opacity-100 z-10'
                                >
                                    <img className='w-5 h-5 opacity-70 hover:opacity-100' src={assets.search_icon} alt="Search" />
                                </button>
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="What do you want to play?"
                                    className='w-full bg-[#242424] text-white pl-12 pr-4 py-3 rounded-full text-sm focus:outline-none'
                                />
                            </div>
                        </form>
                    ) : (
                        <div
                            onClick={activateSearch}
                            className='flex items-center gap-3 cursor-pointer w-full h-full'
                        >
                            <img className='w-6' src={assets.search_icon} alt="Search" />
                            <p className='font-bold'>Search</p>
                        </div>
                    )}
                </div>
            </div>
            <div className='bg-[#121212] h-[85%] rounded'>
                <div className='p-4 flex items-center justify-between'>
                    <div className='flex items-center gap-3'>
                        <img className='w-8' src={assets.stack_icon} alt="" />
                        <p>Your Library</p>
                    </div>
                    <div className='flex items-center gap-3'>
                        <img className='w-5' src={assets.arrow_icon} alt="" />
                        <img className='w-5' src={assets.plus_icon} alt="" />
                    </div>
                </div>
                <div className='p-4 bg-[#242424] m-2 rounded font-semibold flex flex-col items-start justify-start gap-1 pl-4'>
                    <h1>Create your first playlist</h1>
                    <p className='font-light'>It's easy, we will help you</p>
                    <button className='px-4 py-1.5 bg-white text-[15px] text-black rounded-full mt-4'>Create Playlist</button>
                </div>
                <div className='p-4 bg-[#242424] m-2 rounded font-semibold flex flex-col items-start justify-start gap-1 pl-4'>
                    <h1>Let's find some podcasts to follow</h1>
                    <p className='font-light'>We'll keep you update on new episodes</p>
                    <button className='px-4 py-1.5 bg-white text-[15px] text-black rounded-full mt-4'>Browse podcasts</button>
                </div>
            </div>
        </div>
    )
}

export default Sidebar