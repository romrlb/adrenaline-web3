'use client';

import { SWRConfig } from 'swr';
import { useEffect, useState } from 'react';

// Global configuration for SWR cache
export default function SWRConfiguration({ children }) {
  // State to store the cache provider
  const [provider, setProvider] = useState();

  useEffect(() => {
    // Load cache from localStorage on startup
    const map = new Map(
      JSON.parse(localStorage.getItem('app-cache') || '[]')
    );

    // Store only data less than 24 hours old
    const maxAge = 1000 * 60 * 60 * 24;
    for (const [key, { data, timestamp }] of map.entries()) {
      if (Date.now() - timestamp > maxAge) {
        map.delete(key);
      }
    }

    // Create the cache provider
    const provider = new Map(map);
    
    // Before leaving the page, save cache to localStorage
    window.addEventListener('beforeunload', () => {
      const appCache = [];
      
      // Convert Map to array and only save successful responses
      for (const [key, value] of provider.entries()) {
        if (value.data !== undefined && !value.error) {
          appCache.push([key, { ...value, timestamp: Date.now() }]);
        }
      }
      
      // Only keep at most 30 items in the cache to avoid localStorage limits
      const cachesToSave = appCache.slice(-30);
      localStorage.setItem('app-cache', JSON.stringify(cachesToSave));
    });
    
    setProvider(provider);
  }, []);

  if (!provider) return null;

  return (
    <SWRConfig
      value={{
        provider: () => provider,
        // Default refresh behavior
        revalidateIfStale: true,
        revalidateOnFocus: true,
        revalidateOnReconnect: true,
        errorRetryCount: 3,
        // Global error handling
        onError: (error, key) => {
          if (error.status !== 403 && error.status !== 404) {
            console.error(`SWR Error for ${key}:`, error);
          }
        }
      }}
    >
      {children}
    </SWRConfig>
  );
} 