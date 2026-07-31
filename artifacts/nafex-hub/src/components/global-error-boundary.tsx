import { ErrorBoundary, FallbackProps } from "react-error-boundary";
import { Button } from "./ui/button";
import { AlertCircle } from "lucide-react";

function ErrorFallback({ error, resetErrorBoundary }: FallbackProps) {
  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background px-4">
      <div className="mx-auto flex max-w-md flex-col items-center space-y-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
          <AlertCircle className="h-6 w-6 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground break-words max-w-full">
          We're sorry, but an unexpected error occurred. Please try again.
        </p>
        <div className="mt-4 flex gap-3">
          <Button onClick={resetErrorBoundary} variant="default">
            Try again
          </Button>
          <Button onClick={() => window.location.href = '/'} variant="outline">
            Go home
          </Button>
        </div>
      </div>
    </div>
  );
}

export function GlobalErrorBoundary({ children }: { children: React.ReactNode }) {
  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        // Reset state here if needed
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
