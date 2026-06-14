import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
                    <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700">
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="material-symbols-outlined text-3xl text-red-600 dark:text-red-400">error_outline</span>
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Something went wrong</h1>
                        <p className="text-gray-500 dark:text-gray-400 mb-8">
                            An unexpected error has occurred. We've logged this issue and our team will look into it.
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => window.location.reload()}
                                className="w-full py-3 px-4 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                            >
                                <span className="material-symbols-outlined text-sm">refresh</span>
                                Reload Page
                            </button>
                            <button
                                onClick={() => this.setState({ hasError: false })}
                                className="w-full py-3 px-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                            >
                                Try Again
                            </button>
                        </div>
                        {process.env.NODE_ENV === 'development' && this.state.error && (
                            <div className="mt-8 text-left">
                                <p className="text-xs font-mono text-gray-500 bg-gray-100 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-40">
                                    {this.state.error.toString()}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
