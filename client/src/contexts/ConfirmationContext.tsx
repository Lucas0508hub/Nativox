import React, { createContext, useContext, ReactNode } from 'react';
import { useConfirmation } from '@/hooks/use-confirmation';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';

interface ConfirmationContextType {
  confirm: (
    message: string,
    options?: {
      title?: string;
      description?: string;
      confirmText?: string;
      cancelText?: string;
      variant?: 'default' | 'destructive';
    }
  ) => Promise<boolean>;
}

const ConfirmationContext = createContext<ConfirmationContextType | undefined>(undefined);

export function useConfirmationDialog() {
  const context = useContext(ConfirmationContext);
  if (context === undefined) {
    throw new Error('useConfirmationDialog must be used within a ConfirmationProvider');
  }
  return context;
}

interface ConfirmationProviderProps {
  children: ReactNode;
}

export function ConfirmationProvider({ children }: ConfirmationProviderProps) {
  const confirmation = useConfirmation();

  return (
    <ConfirmationContext.Provider value={{ confirm: confirmation.confirm }}>
      {children}
      <ConfirmationDialog
        isOpen={confirmation.isOpen}
        title={confirmation.options.title || ''}
        description={confirmation.options.description || ''}
        confirmText={confirmation.options.confirmText || ''}
        cancelText={confirmation.options.cancelText || ''}
        variant={confirmation.options.variant}
        onConfirm={confirmation.onConfirm}
        onCancel={confirmation.onCancel}
      />
    </ConfirmationContext.Provider>
  );
}
