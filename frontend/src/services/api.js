import axios from 'axios';

// Dynamic base URL: respects environment variable, uses relative /api in production, or local port 3000
const baseURL = (import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:3000/api'
    : '/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // 60 second timeout to accommodate Render free-tier cold starts
});

/**
 * Sends a URL to the backend for auditing.
 * @param {string} url - The URL to audit.
 * @returns {Promise<Object>} The audit metrics returned by the backend.
 */
export const auditRequest = async (url) => {
  try {
    const response = await apiClient.post('/audit', { url });
    return response.data;
  } catch (error) {
    // If the error comes from the backend (e.g., 400 Bad Request)
    if (error.response && error.response.data && error.response.data.message) {
      throw new Error(error.response.data.message);
    }
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      throw new Error('Server response timed out. The backend on Render may be waking up — please try again in 10 seconds.');
    }
    // Network / CORS failure
    throw new Error('Failed to connect to the backend server. Please check your Render backend URL or Netlify VITE_API_BASE_URL setting.');
  }
};
