import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

// Generic API hook for GET requests
export const useApiQuery = <T>(
  queryKey: string[],
  endpoint: string,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    refetchOnWindowFocus?: boolean;
  }
) => {
  return useQuery({
    queryKey,
    queryFn: () => apiRequest("GET", endpoint),
    enabled: options?.enabled ?? true,
    staleTime: options?.staleTime ?? 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? false,
  });
};

// Generic API hook for mutations
export const useApiMutation = <TData = any, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options?: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: any, variables: TVariables) => void;
    invalidateQueries?: string[][];
    successMessage?: string;
    errorMessage?: string;
  }
) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();

  return useMutation({
    mutationFn,
    onSuccess: (data, variables) => {
      // Invalidate specified queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }

      // Show success message
      if (options?.successMessage) {
        toast({
          title: t("success"),
          description: options.successMessage,
        });
      }

      // Call custom onSuccess
      if (options?.onSuccess) {
        options.onSuccess(data, variables);
      }
    },
    onError: (error, variables) => {
      // Show error message
      const errorMessage = options?.errorMessage || error.message || t("error");
      toast({
        title: t("error"),
        description: errorMessage,
        variant: "destructive",
      });

      // Call custom onError
      if (options?.onError) {
        options.onError(error, variables);
      }
    },
  });
};

// Specific hooks for common operations
export const useDeleteMutation = (
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  }
) => {
  return useApiMutation(
    (id: number) => apiRequest("DELETE", `${endpoint}/${id}`),
    {
      successMessage: options?.successMessage || "Item deleted successfully",
      errorMessage: options?.errorMessage || "Failed to delete item",
      invalidateQueries: options?.invalidateQueries,
    }
  );
};

export const useUpdateMutation = <T>(
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  }
) => {
  return useApiMutation(
    ({ id, data }: { id: number; data: Partial<T> }) => 
      apiRequest("PATCH", `${endpoint}/${id}`, data),
    {
      successMessage: options?.successMessage || "Item updated successfully",
      errorMessage: options?.errorMessage || "Failed to update item",
      invalidateQueries: options?.invalidateQueries,
    }
  );
};

export const useCreateMutation = <T>(
  endpoint: string,
  options?: {
    successMessage?: string;
    errorMessage?: string;
    invalidateQueries?: string[][];
  }
) => {
  return useApiMutation(
    (data: T) => apiRequest("POST", endpoint, data),
    {
      successMessage: options?.successMessage || "Item created successfully",
      errorMessage: options?.errorMessage || "Failed to create item",
      invalidateQueries: options?.invalidateQueries,
    }
  );
};
