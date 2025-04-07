// src/hooks/useDataFetching.ts
import { useState, useEffect, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api';

interface FetchOptions {
  url: string;
  dependencies?: any[];
  initialData?: any;
  transform?: (data: any) => any | Promise<any>;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
}

export function useDataFetching<T>({
  url,
  dependencies = [],
  initialData = null,
  transform,
  onSuccess,
  onError,
}: FetchOptions) {
  const [data, setData] = useState<T | null>(initialData);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [version, setVersion] = useState<number>(0);

  const refresh = useCallback(() => {
    setVersion(prev => prev + 1);
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const response = await fetchWithAuth(url, { cache: 'no-store' });

      if (!response.ok) {
        throw new Error(`Failed to fetch data from ${url}`);
      }

      const responseData = await response.json();

      // Handle both synchronous and asynchronous transform functions
      let transformedData;
      if (transform) {
        try {
          const result = transform(responseData);
          // Check if the result is a Promise
          if (result instanceof Promise) {
            transformedData = await result;
          } else {
            transformedData = result;
          }
        } catch (transformError) {
          console.error(`Error in transform function:`, transformError);
          throw transformError;
        }
      } else {
        transformedData = responseData;
      }

      setData(transformedData);
      setError(null);

      if (onSuccess) {
        onSuccess(transformedData);
      }
    } catch (err) {
      console.error(`Error fetching data from ${url}:`, err);

      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);

      if (onError) {
        onError(error);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [url, transform, onSuccess, onError]);

  useEffect(() => {
    setIsLoading(true);
    fetchData();
  }, [...dependencies, version]);

  return {
    data,
    isLoading,
    error,
    isRefreshing,
    refresh,
    setData,
  };
}

export default useDataFetching;
