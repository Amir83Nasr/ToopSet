"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react"
import { AlertCircle, X } from "lucide-react"
import { Button } from "@/components/ui/button"

interface GlobalError {
  id: number
  message: string
}

interface ErrorContextType {
  setError: (message: string) => void
  clearError: (id: number) => void
  clearAll: () => void
}

const ErrorContext = createContext<ErrorContextType | null>(null)

let nextId = 0

export function ErrorProvider({ children }: { children: ReactNode }) {
  const [errors, setErrors] = useState<GlobalError[]>([])

  const setError = useCallback((message: string) => {
    const id = nextId++
    setErrors((prev) => [...prev, { id, message }])
    setTimeout(() => {
      setErrors((prev) => prev.filter((e) => e.id !== id))
    }, 8000)
  }, [])

  const clearError = useCallback((id: number) => {
    setErrors((prev) => prev.filter((e) => e.id !== id))
  }, [])

  const clearAll = useCallback(() => {
    setErrors([])
  }, [])

  return (
    <ErrorContext.Provider value={{ setError, clearError, clearAll }}>
      {errors.length > 0 && (
        <div className="fixed top-4 left-1/2 z-[100] flex w-full max-w-md -translate-x-1/2 flex-col gap-2 px-4">
          {errors.map((error) => (
            <div
              key={error.id}
              className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-4 text-destructive shadow-lg backdrop-blur-sm"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p className="flex-1 text-sm font-medium">{error.message}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => clearError(error.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
      {children}
    </ErrorContext.Provider>
  )
}

export function useGlobalError(): ErrorContextType {
  const ctx = useContext(ErrorContext)
  if (!ctx) {
    throw new Error("useGlobalError must be used within an ErrorProvider")
  }
  return ctx
}
