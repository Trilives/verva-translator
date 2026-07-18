import { Component, type ReactNode } from "react";

interface Props { children: ReactNode }
interface State { message?: string }

/**
 * React unmounts the whole tree on an uncaught render error, which in a
 * frameless Tauri window is indistinguishable from a broken build: a blank
 * white surface with no way to recover. Showing the message instead keeps the
 * window diagnosable.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: unknown): State {
    return { message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.message === undefined) return this.props.children;
    return (
      <div className="crash-screen" role="alert">
        <h2>Something went wrong</h2>
        <p>{this.state.message}</p>
        <button type="button" onClick={() => location.reload()}>Reload</button>
      </div>
    );
  }
}
