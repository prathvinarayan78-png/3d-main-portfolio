import { Component } from 'react';

/*
  Surfaces render errors on the page instead of only in the console, and posts
  them back to the dev server so they show up in the terminal too. Without a
  browser in the build environment this is the only way to see a client-side
  crash.
*/
export class ErrorReport extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    report(`${error?.message}\n${info?.componentStack ?? ''}`);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <pre className="crash">
        {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
      </pre>
    );
  }
}

export function report(message) {
  // eslint-disable-next-line no-console
  console.error('[scene]', message);
  try {
    fetch('/__err', { method: 'POST', body: String(message) }).catch(() => {});
  } catch {
    /* ignore */
  }
}

// Catch anything thrown outside React's tree (WebGL context, async loaders).
export function installGlobalReporting() {
  window.addEventListener('error', (e) => report(`${e.message} @ ${e.filename}:${e.lineno}`));
  window.addEventListener('unhandledrejection', (e) =>
    report(`unhandled rejection: ${e.reason?.stack || e.reason}`)
  );
}
