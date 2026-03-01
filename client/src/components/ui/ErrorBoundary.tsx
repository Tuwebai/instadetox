import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Actualiza el estado para que el siguiente renderizado muestre la UI de fallback
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Omitiremos enviar a un servicio como Sentry por ahora,
    // pero loggeamos para el desarrollador en la terminal del browser
    console.error("ErrorBoundary atrapó un error inespeado:", error, errorInfo);
  }

  private handleReset = () => {
    // Intentar recuperación rápida limpiando el estado
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-black text-white p-4 text-center font-sans">
          <div className="max-w-md w-full p-8 border border-zinc-800 bg-zinc-950 rounded-xl shadow-2xl flex flex-col gap-4">
            <svg 
              className="w-12 h-12 text-red-500 mx-auto" 
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h1 className="text-xl font-semibold tracking-tight">Algo salió mal</h1>
            <p className="text-sm text-zinc-400">
              La aplicación encontró un error inesperado recuperando los datos.
            </p>
            {this.state.error?.message && (
              <pre className="text-xs bg-zinc-900 border border-zinc-800 p-3 rounded text-red-400 overflow-x-auto text-left mt-2 mb-2 break-all whitespace-pre-wrap">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col gap-2">
              <button 
                onClick={this.handleReset}
                className="px-4 py-2 bg-white text-black font-medium text-sm rounded-lg hover:bg-zinc-200 transition-colors w-full"
              >
                Recargar aplicación
              </button>
              <button 
                onClick={() => {
                  window.localStorage.clear();
                  window.sessionStorage.clear();
                  window.location.href = "/login";
                }}
                className="px-4 py-2 border border-zinc-800 text-zinc-400 font-medium text-sm rounded-lg hover:bg-zinc-900 transition-colors w-full"
              >
                Limpieza profunda (Hard Reset)
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
