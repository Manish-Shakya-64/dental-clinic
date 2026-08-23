import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

const AUTH_STORAGE_KEY = "brightsmile.auth";

/** Mirrors authSlice's own check for "is there a real session on disk" — this component renders
 *  outside the Redux Provider (see main.tsx), so it can't read the store and has to look at the
 *  same localStorage key directly. */
function hasStoredSession(): boolean {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { accessToken?: string };
    return !!parsed.accessToken;
  } catch {
    return false;
  }
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Unhandled UI error:", error, info.componentStack);
    // A crash while there's no real session on disk almost always means a page was left rendering
    // stale/cached data through a logout race rather than a genuine bug — send the user to login
    // instead of a dead-end error card they can't do anything useful with.
    if (!hasStoredSession() && window.location.pathname !== "/login") {
      window.location.assign("/login");
    }
  }

  render() {
    if (this.state.error) {
      if (!hasStoredSession()) return null;
      return (
        <div className="flex min-h-screen items-center justify-center bg-page px-4 text-center">
          <div className="max-w-sm rounded-3xl bg-surface p-9 shadow-[20px_20px_50px_rgba(163,184,204,0.35)]">
            <div className="font-heading text-lg font-bold text-ink">Something went wrong</div>
            <p className="mt-2 text-sm text-faint">This screen hit an unexpected error. Sign in again to continue.</p>
            <button
              onClick={() => {
                // Whatever caused this, the safest recovery is a clean slate: drop the (possibly
                // stale/invalid) session and land back on login rather than retrying the same
                // broken state with Reload.
                localStorage.removeItem(AUTH_STORAGE_KEY);
                window.location.assign("/login");
              }}
              className="mt-5 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-white"
            >
              Log in
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
