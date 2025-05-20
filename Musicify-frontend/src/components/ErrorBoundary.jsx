import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error("Error caught by ErrorBoundary:", error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4 bg-red-900 text-white rounded-lg">
          <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
          <p className="mb-4">Please try refreshing the page or contact support if the issue persists.</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-white text-red-900 rounded-lg font-medium hover:bg-gray-100"
          >
            Refresh Page
          </button>
          {this.props.onReset && (
            <button 
              onClick={() => {
                this.setState({ hasError: false, error: null, errorInfo: null });
                this.props.onReset();
              }}
              className="px-4 py-2 bg-transparent border border-white text-white rounded-lg font-medium ml-2 hover:bg-white/10"
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    return this.props.children; 
  }
}

export default ErrorBoundary;