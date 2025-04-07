"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

interface ErrorBoundaryWrapperProps {
  /** Konten yang dibungkus oleh error boundary */
  children: ReactNode;
  /** Komponen fallback yang ditampilkan saat terjadi error */
  fallback?: ReactNode;
  /** Fungsi yang dipanggil saat tombol reset diklik */
  onReset?: () => void;
  /** Kelas CSS tambahan */
  className?: string;
}

interface ErrorBoundaryWrapperState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Komponen ErrorBoundaryWrapper untuk menangkap error di level komponen
 */
class ErrorBoundaryWrapper extends Component<ErrorBoundaryWrapperProps, ErrorBoundaryWrapperState> {
  constructor(props: ErrorBoundaryWrapperProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryWrapperState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error("Error caught by ErrorBoundaryWrapper:", error, errorInfo);
  }

  resetErrorBoundary = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className={`p-6 space-y-4 ${this.props.className || ""}`}>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Terjadi kesalahan</AlertTitle>
            <AlertDescription>
              {this.state.error?.message || "Terjadi kesalahan yang tidak diketahui"}
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center justify-center text-center py-10">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <h3 className="text-lg font-medium">Komponen tidak dapat ditampilkan</h3>
            <p className="text-muted-foreground mt-2 mb-4">
              Terjadi kesalahan saat memuat komponen ini. Silakan coba lagi.
            </p>
            <Button 
              onClick={this.resetErrorBoundary}
              className="mt-2"
              variant="outline"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Coba Lagi
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export { ErrorBoundaryWrapper };
