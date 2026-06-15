import { toast as sonnerToast } from 'sonner';

export const toast = {
  success: (message: string, description?: string) => {
    sonnerToast.success(message, {
      description,
      style: {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-1)',
      },
    });
  },
  error: (message: string, description?: string) => {
    sonnerToast.error(message, {
      description,
      style: {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-1)',
      },
    });
  },
  info: (message: string, description?: string) => {
    sonnerToast.info(message, {
      description,
      style: {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-1)',
      },
    });
  },
  loading: (message: string, description?: string) => {
    return sonnerToast.loading(message, {
      description,
      style: {
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        color: 'var(--text-1)',
      },
    });
  },
};
export default toast;
