import { toast as sonnerToast } from "sonner"

type ToastOptions = {
  description?: string
  duration?: number
}

export const toast = {
  success(message: string, options?: ToastOptions) {
    return sonnerToast.success(message, {
      description: options?.description,
      duration: options?.duration ?? 3000,
    })
  },

  error(message: string, options?: ToastOptions) {
    return sonnerToast.error(message, {
      description: options?.description,
      duration: options?.duration ?? 5000,
    })
  },

  info(message: string, options?: ToastOptions) {
    return sonnerToast.info(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    })
  },

  warning(message: string, options?: ToastOptions) {
    return sonnerToast.warning(message, {
      description: options?.description,
      duration: options?.duration ?? 4000,
    })
  },

  promise<T>(
    promise: Promise<T>,
    messages: { loading: string; success: string; error: string }
  ) {
    return sonnerToast.promise(promise, {
      loading: messages.loading,
      success: messages.success,
      error: (err) =>
        err instanceof Error ? err.message : messages.error,
    })
  },
}
