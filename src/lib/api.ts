// Helper function to fetch data with authentication token
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  // Get token from localStorage (client-side only)
  const token = typeof window !== 'undefined' 
    ? localStorage.getItem('token') 
    : null;
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  } as Record<string, string>;
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(url, {
    ...options,
    headers,
  });
}

// Helper for safe response creation in API routes
export function createSafeResponse(data: any, status = 200): Response {
  const responseBody = JSON.stringify(data || {});
  return new Response(responseBody, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}