import { API_BASE_URL } from "@/constants";

// Utility function for making authenticated API calls
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  
  // Prepend base URL if the URL is relative
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

// Utility function for making authenticated API calls with FormData
export async function authenticatedFetchFormData(url: string, formData: FormData, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  
  // Prepend base URL if the URL is relative
  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  
  const headers: Record<string, string> = {};

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(fullUrl, {
    method: options.method || "POST",
    headers,
    body: formData,
    ...options,
  });
}
