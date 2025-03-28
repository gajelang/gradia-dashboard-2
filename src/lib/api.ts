// Helper function to fetch data with authentication token
// lib/api.ts
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // Attempt to get token from localStorage (client-side only)
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as Record<string, string>;
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(url, {
      ...options,
      headers,
    });
    
    // Check if response is successful
    if (!response.ok) {
      // Try to parse error message from server
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.error || 
        `HTTP error! status: ${response.status}`
      );
    }
    
    // Validate content type
    const contentType = response.headers.get('Content-Type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      throw new Error(`Expected JSON but received: ${text.substring(0, 100)}`);
    }
    
    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}



// Generic response data type to replace 'any'
export type ResponseData = 
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

// Helper for safe response creation in API routes
export function createSafeResponse(data: ResponseData, status = 200): Response {
  const responseBody = JSON.stringify(data || {});
  return new Response(responseBody, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}