import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw } from 'lucide-react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', maxWidth: '500px', borderColor: 'var(--accent-f1)' }}>
            <AlertCircle size={48} color="var(--accent-f1)" style={{ margin: '0 auto 1.5rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>SYSTEM CRASH</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: '1.6' }}>
              The application encountered a critical runtime error. This might be due to a malformed data stream or a missing dependency.
            </p>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '2rem', fontStyle: 'italic', fontSize: '0.85rem' }}>
              {this.state.error?.message}
            </div>
            <button 
              className="replay-button"
              onClick={() => window.location.reload()}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0 auto' }}
            >
              <RotateCcw size={16} />
              Reset Dashboard
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
