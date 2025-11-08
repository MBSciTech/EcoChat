const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ecochat-ep0h.onrender.com/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'https://ecochat-ep0h.onrender.com';

// Log configuration in development
if (process.env.NODE_ENV === 'development') {
  console.log('API Configuration:', {
    API_BASE_URL,
    SOCKET_URL,
    usingEnv: !!process.env.REACT_APP_API_URL,
  });
}

export { API_BASE_URL, SOCKET_URL };

