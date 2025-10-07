import { useQuery } from "@tanstack/react-query";

interface User {
  firstName?: string;
  lastName?: string;
  email?: string;
  role?: string;
}

export function useAuth() {
  const query = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: Infinity,
  });

  return {
    user: query.data,
    isLoading: query.isLoading,
    isAuthenticated: !!query.data,
    isDevelopmentMode: false, // Always false in prototype mode
  };
}
