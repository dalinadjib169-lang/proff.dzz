import React, { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-8 text-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mb-6">
            <AlertCircle className="w-10 h-10 text-red-500" />
          </div>
          <h1 className="text-2xl font-black text-white mb-4">Oops! Something went wrong.</h1>
          <p className="text-slate-400 max-w-md mb-8">
            The application encountered an unexpected error. This might be due to a temporary connection issue or a bug.
          </p>
          
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl mb-8 w-full max-w-lg overflow-auto">
            <p className="text-red-400 font-mono text-xs text-left whitespace-pre-wrap">
              {this.state.error?.toString()}
            </p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Refresh Page
            </button>
            <button
              onClick={() => {
                localStorage.clear();
                window.location.href = '/login';
              }}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-bold hover:bg-slate-700 transition-all"
            >
              Reset App Data
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
