import { useState, useCallback } from 'react';
import { api } from '../lib/api.js';

export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = useCallback(async (method, path, body = null) => {
    setLoading(true);
    setError(null);
    try {
      return await api[method](path, body);
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    setError,
    get: useCallback((path) => execute('get', path), [execute]),
    post: useCallback((path, body) => execute('post', path, body), [execute]),
    put: useCallback((path, body) => execute('put', path, body), [execute]),
    del: useCallback((path) => execute('delete', path), [execute]),
  };
}

export default useApi;
