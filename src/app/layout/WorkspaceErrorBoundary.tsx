import { Component, type ErrorInfo, type ReactNode } from 'react';

export class WorkspaceErrorBoundary extends Component<{ readonly name: string; readonly children: ReactNode }, { readonly error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) { console.error(`Tominal ${this.props.name} workspace failed`, error, info.componentStack); }
  componentDidUpdate(previous: { readonly name: string }) { if (previous.name !== this.props.name && this.state.error) this.setState({ error: undefined }); }
  render() {
    if (this.state.error) return <div className="m-6 border border-red-900 bg-red-950/50 p-5 text-sm text-red-200"><strong>Workspace unavailable</strong><p className="mt-2 font-mono text-xs text-red-300">{this.state.error.message}</p></div>;
    return this.props.children;
  }
}
