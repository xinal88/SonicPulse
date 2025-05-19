import { useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';

const AuthSync = () => {
    const { user, isLoaded } = useUser();

    useEffect(() => {
        const syncUserWithBackend = async () => {
            if (!user || !isLoaded) return;

            try {
                const response = await fetch('http://localhost:4000/api/auth/callback', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl
                    }),
                });

                if (!response.ok) {
                    throw new Error('Failed to sync user with backend');
                }

                await response.json();
            } catch (error) {
                // Silently handle errors in production
            }
        };

        syncUserWithBackend();
    }, [user, isLoaded]);

    return null; // This component doesn't render anything
};

export default AuthSync;