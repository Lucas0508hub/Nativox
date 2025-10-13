import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { ApiResponse } from '@/types/api';

export function useApi() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleError = (error: Error) => {
    const message = (error as any)?.response?.data?.detail || error?.message || 'An error occurred';
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  };

  const handleSuccess = (message: string) => {
    toast({
      title: "Success",
      description: message,
    });
  };

  return {
    queryClient,
    handleError,
    handleSuccess,
  };
}

export function useApiMutation<TData = unknown, TVariables = unknown>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData) => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    invalidateQueries?: string[][];
  }
) {
  const { handleError, handleSuccess, queryClient } = useApi();

  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: (data) => {
      if (options?.successMessage) {
        handleSuccess(options.successMessage);
      }
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => queryClient.invalidateQueries({ queryKey }));
      }
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      handleError(error);
      options?.onError?.(error);
    },
  });
}

export function useApiQuery<TData = unknown>(
  queryKey: string[],
  queryFn: () => Promise<TData>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    cacheTime?: number;
  }
) {
  return useQuery({
    queryKey,
    queryFn,
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000,
    cacheTime: options?.cacheTime ?? 10 * 60 * 1000,
  });
}