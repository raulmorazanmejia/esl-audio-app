import React from "react";

type Props = {
  area: "student" | "teacher";
  onGoBack?: () => void;
  children: React.ReactNode;
};

type State = { hasError: boolean };

export default class AppErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[${this.props.area}] runtime error`, error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return <div style={{ minHeight: "60vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div style={{ maxWidth: 620, width: "100%", border: "1px solid #cbd5e1", borderRadius: 16, padding: 20, background: "#fff" }}>
        <h2 style={{ marginTop: 0 }}>Something went wrong.</h2>
        <p>The app hit an unexpected error, but your session is still safe.</p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => this.props.onGoBack?.()}>Go back</button>
          {this.props.area === "student" ? <button type="button" onClick={() => window.location.assign("/?mode=student")}>Return to activities</button> : null}
          {this.props.area === "teacher" ? <button type="button" onClick={() => window.location.assign("/?mode=teacher")}>Return to dashboard</button> : null}
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    </div>;
  }
}
