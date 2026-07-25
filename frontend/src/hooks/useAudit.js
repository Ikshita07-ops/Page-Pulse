import { useState } from 'react';
import { auditRequest } from '../services/api';

export const useAudit = () => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [recentSearches, setRecentSearches] = useState([]);

  const auditUrl = async (url) => {
    setIsLoading(true);
    setError(null);
    setData(null);

    try {
      const response = await auditRequest(url);
      setData(response.data);
      
      setRecentSearches(prev => {
        const updated = [url, ...prev.filter(item => item !== url)].slice(0, 5);
        return updated;
      });
    } catch (err) {
      setError(err.message || 'An unexpected error occurred while analyzing the URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const reset = () => {
    setData(null);
    setError(null);
  };

  return { data, isLoading, error, recentSearches, auditUrl, reset };
};
