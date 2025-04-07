// lib/api.ts
/**
 * Enhanced API client with proper endpoint mapping
 */

// API endpoint paths for correct mapping
export const API_ENDPOINTS = {
  // Financial analytics
  REVENUE: '/api/analytics/revenue',
  EXPENSES: '/api/analytics/expenses',
  FINANCIAL_COMPARISON: '/api/analytics/financial-comparison',
  EXPENSE_CATEGORIES: '/api/analytics/expense-categories',
  MONTHLY_REVENUE: '/api/analytics/revenue/monthly',

  // Invoices
  INVOICES: '/api/invoices',
  INVOICE_DETAIL: (id: string) => `/api/invoices/${id}`,

  // Fund balances
  FUND_BALANCE: '/api/fund-balance',
  FUND_TRANSACTIONS: '/api/fund-transactions',
  FUND_TRANSFER: '/api/fund-transfer',

  // Transactions
  TRANSACTIONS: '/api/transactions',
  TRANSACTION_DETAIL: (id: string) => `/api/transactions/${id}`,
  TRANSACTION_EXPENSES: '/api/transactions/expenses',

  // Projects
  PROJECTS: '/api/projects',
  PROJECT_PROFITABILITY: '/api/projects/profitability',
};

// Type definitions
export type ResponseData =
  | Record<string, unknown>
  | Array<unknown>
  | string
  | number
  | boolean
  | null;

/**
 * Helper function to fetch data with authentication token
 * Enhanced with better error handling and cookie-based auth
 */
export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  try {
    // We don't need to manually add the token anymore since we're using HttpOnly cookies
    // The browser will automatically include the cookie in the request

    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    } as Record<string, string>;

    // Get CSRF token from localStorage if available
    const user = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    let csrfToken = null;

    if (user) {
      try {
        const userData = JSON.parse(user);
        if (userData.csrfToken) {
          csrfToken = userData.csrfToken;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }

    // Add CSRF token to headers if available
    if (csrfToken) {
      headers['X-CSRF-Token'] = csrfToken;
    }

    // Log the request (useful for debugging)
    console.log(`API Request: ${url}`, { method: options.method || 'GET' });

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Include cookies in the request
    });

    // Check if response is successful
    if (!response.ok) {
      console.warn(`API request failed: ${url} (${response.status})`);

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

/**
 * Helper for safe response creation in API routes
 */
export function createSafeResponse(data: ResponseData, status = 200): Response {
  const responseBody = JSON.stringify(data || {});
  return new Response(responseBody, {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Gets the authentication token from localStorage
 */
export function getAuthToken(): string {
  return typeof window !== 'undefined' ? localStorage.getItem('token') || '' : '';
}