/**
 * Hook untuk penanganan API yang konsisten
 */
import { useState, useCallback } from 'react';
import { fetchWithAuth } from '@/lib/api/api';
import { toast } from 'react-hot-toast';
import { messages } from '@/lib/translations';

interface UseApiOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
}

/**
 * Hook untuk penanganan API yang konsisten
 * @returns Object dengan fungsi-fungsi untuk melakukan operasi API
 */
export function useApi() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  
  /**
   * Melakukan request GET
   * @param url - URL endpoint
   * @param options - Opsi tambahan
   * @returns Data hasil request
   */
  const get = useCallback(async <T = any>(
    url: string,
    options: UseApiOptions = {}
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(url, { cache: 'no-store' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Gagal mengambil data dari ${url}`);
      }
      
      const data = await response.json();
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options.onSuccess) {
        options.onSuccess(data);
      }
      
      return data;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      
      const errorMessage = options.errorMessage || errorObj.message || messages.errors.general;
      toast.error(errorMessage);
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Melakukan request POST
   * @param url - URL endpoint
   * @param data - Data yang akan dikirim
   * @param options - Opsi tambahan
   * @returns Data hasil request
   */
  const post = useCallback(async <T = any>(
    url: string,
    data: any,
    options: UseApiOptions = {}
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(url, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Gagal mengirim data ke ${url}`);
      }
      
      const responseData = await response.json();
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options.onSuccess) {
        options.onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      
      const errorMessage = options.errorMessage || errorObj.message || messages.errors.general;
      toast.error(errorMessage);
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Melakukan request PUT
   * @param url - URL endpoint
   * @param data - Data yang akan dikirim
   * @param options - Opsi tambahan
   * @returns Data hasil request
   */
  const put = useCallback(async <T = any>(
    url: string,
    data: any,
    options: UseApiOptions = {}
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(url, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Gagal memperbarui data di ${url}`);
      }
      
      const responseData = await response.json();
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options.onSuccess) {
        options.onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      
      const errorMessage = options.errorMessage || errorObj.message || messages.errors.general;
      toast.error(errorMessage);
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  /**
   * Melakukan request DELETE
   * @param url - URL endpoint
   * @param options - Opsi tambahan
   * @returns Data hasil request
   */
  const del = useCallback(async <T = any>(
    url: string,
    options: UseApiOptions = {}
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetchWithAuth(url, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || `Gagal menghapus data di ${url}`);
      }
      
      const responseData = await response.json();
      
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      
      if (options.onSuccess) {
        options.onSuccess(responseData);
      }
      
      return responseData;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      
      const errorMessage = options.errorMessage || errorObj.message || messages.errors.general;
      toast.error(errorMessage);
      
      if (options.onError) {
        options.onError(errorObj);
      }
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    loading,
    error,
    get,
    post,
    put,
    delete: del,
  };
}

export default useApi;
