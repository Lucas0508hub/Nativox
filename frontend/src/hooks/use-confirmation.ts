import { useState } from 'react';
import { useLanguage } from '@/lib/i18n';

interface ConfirmationOptions {
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmationState {
  isOpen: boolean;
  options: ConfirmationOptions;
  onConfirm: () => void;
  onCancel: () => void;
}

export function useConfirmation() {
  const [state, setState] = useState<ConfirmationState>({
    isOpen: false,
    options: {},
    onConfirm: () => {},
    onCancel: () => {},
  });

  const { t } = useLanguage();

  const confirm = (
    message: string,
    options: ConfirmationOptions = {}
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options: {
          title: options.title || t('confirmAction'),
          description: message,
          confirmText: options.confirmText || t('confirm'),
          cancelText: options.cancelText || t('cancel'),
          variant: options.variant || 'default',
        },
        onConfirm: () => {
          setState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        },
      });
    });
  };

  const close = () => {
    setState(prev => ({ ...prev, isOpen: false }));
  };

  return {
    ...state,
    confirm,
    close,
  };
}
