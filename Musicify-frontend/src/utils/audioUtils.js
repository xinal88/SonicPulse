// Simplified version that doesn't do heavy processing
export const convertToWav = async (audioBlob) => {
    console.log('Skipping client-side conversion to prevent freezing');
    return audioBlob; // Just return the original blob
};

