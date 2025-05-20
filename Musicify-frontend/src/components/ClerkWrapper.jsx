import React from 'react';
import { ClerkProvider } from '@clerk/clerk-react';

const ClerkWrapper = ({ children, publishableKey }) => {
  // Check if Clerk should be disabled
  const disableClerk = localStorage.getItem('disableClerk') === 'true';
  
  if (disableClerk) {
    // If disabled, just render children without Clerk
    return <>{children}</>;
  }
  
  // Otherwise, use Clerk as normal
  return (
    <ClerkProvider 
      publishableKey={publishableKey} 
      afterSignOutUrl='/'
      allowedRedirectOrigins={['http://localhost:5173']}
      isSatellite={false}
      cookieDomain={window.location.hostname}
      cookieSecure={window.location.protocol === 'https:'}
    >
      {children}
    </ClerkProvider>
  );
};

export default ClerkWrapper;