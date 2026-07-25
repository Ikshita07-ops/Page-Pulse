import axios from 'axios';

// Dynamic base URL supporting environment variable override in production (e.g. Vercel)
const baseURL = (import.meta.env && import.meta.env.VITE_API_BASE_URL)
  ? import.meta.env.VITE_API_BASE_URL
  : 'http://localhost:3000/api';

const apiClient = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000, // 15 second timeout for the request
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
    // If it's a network error (CORS, server down, etc.)
    throw new Error('Failed to connect to the server. Please try again later.');
  }
};
