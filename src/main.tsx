import React, { Component, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FFF8E6] flex flex-col items-center justify-center p-6 text-center font-poppins">
          <div className="bg-white p-8 rounded-3xl border border-purple-100 shadow-xl max-w-md w-full space-y-4">
            <div className="w-16 h-16 rounded-full bg-[#6A1B9A] text-white flex items-center justify-center mx-auto font-bold text-2xl">
              !
            </div>
            <h1 className="text-2xl font-bold text-[#222222]">Nafex Hub</h1>
            <p className="text-sm text-[#6B7280]">
              The page encountered a temporary loading issue or stale cached asset.
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then(regs => {
                    regs.forEach(reg => reg.unregister());
                  });
                }
                window.location.reload();
              }}
              className="w-full h-11 rounded-xl bg-[#6A1B9A] hover:bg-[#5B1687] text-white font-bold text-sm transition-all shadow-md"
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// Unregister legacy service workers to prevent cached blank pages
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
