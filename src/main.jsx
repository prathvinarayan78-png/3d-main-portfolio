import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './three/Scene';
import Overlay from './Overlay';
import { startLenis } from './scroll';
import { ErrorReport, installGlobalReporting } from './ErrorReport';
import './styles.css';

installGlobalReporting();

function App() {
  const [ready, setReady] = useState(false);

  useEffect(() => startLenis(), []);

  // Generating the forest blocks briefly on first paint; hold the curtain
  // until the browser has actually rendered a frame or two.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(() => setReady(true), 900))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <div className={`loader ${ready ? 'done' : ''}`}>
        <span className="loader-mark">Prathvi</span>
      </div>
      <div className="stage">
        <ErrorReport>
          <Scene />
        </ErrorReport>
      </div>
      <Overlay />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);
