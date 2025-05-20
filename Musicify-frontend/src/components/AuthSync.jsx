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
                        // Add these headers to help with CORS
                        'Accept': 'application/json',
                    },
                    // Don't include credentials for this request
                    credentials: 'omit',
                    body: JSON.stringify({
                        id: user.id,
                        firstName: user.firstName,
                        lastName: user.lastName,
                        imageUrl: user.imageUrl
                    }),
                });

                if (!response.ok) {
                    console.warn('Failed to sync user with backend:', response.status);
                    return;
                }

                await response.json();
            } catch (error) {
                // Log error but don't disrupt the user experience
                console.warn('Error syncing user with backend:', error);
            }
        };

        // Add a small delay to avoid race conditions with Clerk initialization
        const timeoutId = setTimeout(syncUserWithBackend, 1000);
        return () => clearTimeout(timeoutId);
    }, [user, isLoaded]);

    return null; // This component doesn't render anything
};

export default AuthSync;
