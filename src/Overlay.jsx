import { useEffect, useState, useSyncExternalStore } from 'react';
import { sections } from './content';
import { subscribe, getActive, scrollToSection } from './scroll';

function Nav() {
  const active = useSyncExternalStore(subscribe, getActive, () => 0);
  return (
    <nav className="dots" aria-label="Sections">
      {sections.map((s, i) => (
        <button
          key={s.id}
          className={i === active ? 'dot on' : 'dot'}
          onClick={() => scrollToSection(i)}
          aria-label={s.title.replace('\n', ' ')}
          aria-current={i === active ? 'true' : undefined}
        />
      ))}
    </nav>
  );
}

function Panel({ s, i }) {
  const active = useSyncExternalStore(subscribe, getActive, () => 0);
  const on = i === active;
  return (
    <section className={`panel ${s.id} ${on ? 'visible' : ''}`} id={s.id}>
      <div className="inner">
        <p className="kicker">{s.kicker}</p>
        <h1 className={i === 0 ? 'display' : 'heading'}>{s.title}</h1>
        {s.lead && <p className="lead">{s.lead}</p>}
        <p className="body">{s.body}</p>
        {s.meta && (
          <ul className="meta">
            {s.meta.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        )}
        {s.email && (
          <a className="mail" href={`mailto:${s.email}`}>
            {s.email}
          </a>
        )}
      </div>
    </section>
  );
}

export default function Overlay() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 700);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <header className="topbar">
        <span className="mark">PRATHVI</span>
        <span className="role">Editor · Motion · Brand</span>
      </header>

      <Nav />

      <div className="scroller">
        {sections.map((s, i) => (
          <Panel key={s.id} s={s} i={i} />
        ))}
      </div>

      <div className={`hint ${ready ? 'show' : ''}`}>
        <span>scroll</span>
        <i />
      </div>
    </>
  );
}
