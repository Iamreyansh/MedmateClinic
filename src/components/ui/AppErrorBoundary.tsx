import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * The boundary around the whole app.
 *
 * One screen that throws must not take the clinic's whole dashboard down with
 * it. The boundary catches it, says what happened in the product's own words,
 * and offers the two things a person can do: try again, or reload.
 */
type Props = {
  children: ReactNode;
};

type State = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // the browser's console is where a developer looks; the screen is where a
    // person looks, and it says nothing technical
    console.error("MedMate Clinic hit an error", error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "var(--surface-2)",
        }}
      >
        <div className="card" style={{ maxWidth: 520, padding: 28 }}>
          <span className="kiosk-ic warn">
            <Icon name="alert" size={26} />
          </span>
          <h1 className="t-h2" style={{ marginTop: 12 }}>
            That screen did not open
          </h1>
          <p className="t-cap" style={{ marginTop: 8 }}>
            Something went wrong while drawing it. Nothing has been lost — the clinic&rsquo;s records
            are where they always are.
          </p>
          <div style={{ display: "flex", gap: 8, marginTop: 16, flexWrap: "wrap" }}>
            <Button onClick={this.reset}>Try again</Button>
            <Button variant="secondary" onClick={() => window.location.reload()}>
              Reload the app
            </Button>
          </div>
        </div>
      </div>
    );
  }
}
