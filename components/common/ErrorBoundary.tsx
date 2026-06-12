"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { logger } from "@/lib/logger";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error("Uncaught error in React component tree:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] p-6 bg-red-50/50 rounded-lg border border-red-100 m-4">
          <div className="text-red-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6 text-center max-w-md">
            An unexpected error occurred in this section of the application. The error has been logged for our team to investigate.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
          >
            Try again
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
