// Utility function for making authenticated API calls
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

// Utility function for making authenticated API calls with FormData
export async function authenticatedFetchFormData(url: string, formData: FormData, options: RequestInit = {}): Promise<Response> {
  const token = localStorage.getItem("token");
  
  const headers: Record<string, string> = {};

  // Add Authorization header if token exists
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  return fetch(url, {
    method: options.method || "POST",
    headers,
    body: formData,
    ...options,
  });
}
