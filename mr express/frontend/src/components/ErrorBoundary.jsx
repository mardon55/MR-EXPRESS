import { Component } from 'react';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
          <div className="glass rounded-squircle-lg px-8 py-8 shadow-glass-lg">
            <p className="text-3xl">⚠️</p>
            <h2 className="mt-3 text-lg font-bold text-neutral-900">Xatolik yuz berdi</h2>
            <p className="mt-2 text-sm text-ios-muted">{this.state.error.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="press-fluid mt-6 rounded-squircle bg-ios-blue px-6 py-3 font-semibold text-white"
            >
              Qayta yuklash
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
