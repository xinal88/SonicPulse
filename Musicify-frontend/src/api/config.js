// If you have an API config file, make sure the base URL is correct
// If not, create one to centralize your API configuration

const API_BASE_URL = process.env.NODE_ENV === 'production' 
    ? '/api' 
    : 'http://localhost:4000/api'; // Update this to match your backend server port

export const API_ENDPOINTS = {
    SONGS: {
        FIND: `${API_BASE_URL}/song/find`, // Note: changed from songs to song to match your routes
        UPLOAD: `${API_BASE_URL}/song/upload`,
        DOWNLOAD: `${API_BASE_URL}/song/download`,
        LIST: `${API_BASE_URL}/song/list`,
        ADD: `${API_BASE_URL}/song/add`,
        REMOVE: `${API_BASE_URL}/song/remove`,
        UPDATE: `${API_BASE_URL}/song/update`,
    },
    FIND_SONG: "http://localhost:4000/api/song/find"
};

// Add a console log to verify the endpoint
console.log("API endpoints configured:", API_ENDPOINTS);

export default API_BASE_URL;


