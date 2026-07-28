import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError() {
        // Update state so the next render will show the fallback UI
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        // Log the error to console for debugging
        console.error('Error caught by boundary:', error, errorInfo);
        this.setState({
            error,
            errorInfo
        });
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        // Optionally reload the page
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            // Fallback UI
            return (
                <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4 font-sans">
                    <div className="relative z-10 max-w-md w-full rounded-2xl border border-white/10 bg-white/[0.05] backdrop-blur-md shadow-2xl p-8 text-center">
                        <div className="mb-6">
                            <div className="inline-block p-4 bg-danger-500/15 rounded-full mb-4">
                                <svg className="w-12 h-12 text-danger-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h1 className="text-2xl font-bold text-white mb-2">
                                Oops! Something went wrong
                            </h1>
                            <p className="text-slate-300 mb-6">
                                We encountered an unexpected error. Don't worry, your data is safe.
                            </p>
                        </div>

                        {import.meta.env.DEV && this.state.error && (
                            <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg text-left overflow-auto max-h-48">
                                <p className="text-xs font-mono text-danger-400 mb-2">
                                    {this.state.error.toString()}
                                </p>
                                {this.state.errorInfo && (
                                    <details className="text-xs text-slate-400">
                                        <summary className="cursor-pointer font-semibold mb-2">Stack Trace</summary>
                                        <pre className="whitespace-pre-wrap">
                                            {this.state.errorInfo.componentStack}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={this.handleReset}
                                className="w-full bg-gradient-to-r from-primary-600 to-primary-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg shadow-primary-500/30 hover:shadow-xl hover:shadow-primary-500/40 transition-all"
                            >
                                Reload Page
                            </button>
                            <button
                                onClick={() => window.history.back()}
                                className="w-full border border-white/20 bg-white/10 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors"
                            >
                                Go Back
                            </button>
                            <button
                                onClick={() => window.location.href = '/'}
                                className="w-full text-primary-300 px-6 py-3 rounded-lg font-medium hover:bg-primary-500/10 transition-colors"
                            >
                                Return to Home
                            </button>
                        </div>

                        <p className="mt-6 text-sm text-slate-500">
                            If this problem persists, please contact support.
                        </p>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
