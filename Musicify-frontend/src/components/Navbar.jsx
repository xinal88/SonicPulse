import React, { useContext } from 'react'
import { assets } from '../assets/frontend-assets/assets'
import { useNavigate, useLocation } from 'react-router-dom'
import { SignedIn, SignedOut, UserButton, SignInButton } from "@clerk/clerk-react"
import { PlayerContext } from '../context/PlayerContext'

const Navbar = ({ showNavigation }) => {
    const { randomGenres } = useContext(PlayerContext)
    const navigate = useNavigate()
    const location = useLocation()

    // If showNavigation prop is not provided, determine based on location
    const shouldShowNavigation = showNavigation !== undefined
        ? showNavigation
        : location.pathname === '/'

    return (
        <>
            <div className='w-full flex justify-between items-center font-semibold'>
                <div className='flex items-center gap-2'>
                    <img onClick={() => navigate(-1)} className='w-8 bg-black p-2 rounded-2xl cursor-pointer' src={assets.arrow_left} alt="" />
                    <img onClick={() => navigate(1)} className='w-8 bg-black p-2 rounded-2xl cursor-pointer' src={assets.arrow_right} alt="" />
                </div>
                <div className='flex items-center gap-4'>
                    <p className='bg-white text-black text-[15px] px-4 py-1 rounded-2xl hidden md:block'>Shazam</p>
                    <SignedOut>
                        <SignInButton>
                            <button className='bg-white text-black px-4 py-1 rounded-2xl cursor-pointer'>
                                Sign In
                            </button>
                        </SignInButton>
                    </SignedOut>
                    <SignedIn>
                        <UserButton
                            afterSignOutUrl="/"
                            appearance={{
                                elements: {
                                    avatarBox: "w-8 h-8"
                                }
                            }}
                        />
                    </SignedIn>
                </div>
            </div>
            {shouldShowNavigation && (
                <div className='flex items-center gap-2 mt-4 flex-wrap'>
                    <p
                        className={`${location.pathname === '/' ? 'bg-white text-black' : 'bg-black'} px-4 py-1 rounded-2xl cursor-pointer`}
                        onClick={() => navigate('/')}
                    >
                        All
                    </p>
                    {randomGenres.map((genre) => (
                        <p
                            key={genre._id}
                            className={`${location.pathname === `/genre/${genre._id}` ? 'bg-white text-black' : 'bg-black'} px-4 py-1 rounded-2xl cursor-pointer`}
                            onClick={() => navigate(`/genre/${genre._id}`)}
                        >
                            {genre.name}
                        </p>
                    ))}
                </div>
            )}
        </>
    )
}

export default Navbar