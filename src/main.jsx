import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Scene from './three/Scene';
import Overlay from './Overlay';
import { startLenis } from './scroll';
import './styles.css';

function App() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => startLenis(), []);

  // The first frame of a 26-tree forest takes a moment; hold the curtain
  // until the browser has actually painted it.
  useEffect(() => {
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => setTimeout(() => setLoaded(true), 400))
    );
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <>
      <div className={`loader ${loaded ? 'done' : ''}`}>Prathvi</div>
      <div className="stage">
        <Scene />
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
