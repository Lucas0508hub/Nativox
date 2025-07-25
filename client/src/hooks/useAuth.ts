import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const query = useQuery({
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
