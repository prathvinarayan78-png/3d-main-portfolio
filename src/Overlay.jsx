import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { sections } from './content';
import { subscribe, getActive, scrollToSection, scroll } from './scroll';

/* Split a line into words so each can animate in on its own delay. */
const Words = ({ text, className = '', delay = 0 }) => (
  <span className={className}>
    {text.split(' ').map((w, i) => (
      <span className="word" key={i}>
        <span className="word-in" style={{ transitionDelay: `${delay + i * 55}ms` }}>
          {w}
        </span>
      </span>
    ))}
  </span>
);

function Progress() {
  const ref = useRef();
  useEffect(() => {
    let raf;
    const loop = () => {
      if (ref.current) ref.current.style.transform = `scaleX(${scroll.progress})`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="progress">
      <i ref={ref} />
    </div>
  );
}

function Nav() {
  const active = useSyncExternalStore(subscribe, getActive, () => 0);
  return (
    <nav className="rail" aria-label="Sections">
      {sections.map((s, i) => (
        <button
          key={s.id}
          className={i === active ? 'tick on' : 'tick'}
          onClick={() => scrollToSection(i)}
          aria-current={i === active ? 'true' : undefined}
          aria-label={s.kicker}
        >
          <span className="tick-line" />
          <span className="tick-label">{s.kicker}</span>
        </button>
      ))}
    </nav>
  );
}

function Panel({ s, i }) {
  const active = useSyncExternalStore(subscribe, getActive, () => 0);
  const on = i === active;

  return (
    <section className={`panel ${on ? 'visible' : ''}`} id={s.id} data-side={i % 2 ? 'right' : 'left'}>
      <div className="inner">
        <header className="head">
          {s.index && <span className="idx">{s.index}</span>}
          <span className="rule" />
          <span className="kicker">{s.kicker}</span>
        </header>

        {i === 0 ? (
          <h1 className="display">
            <Words text={s.title} delay={120} />
          </h1>
        ) : (
          <h2 className="heading">
            <Words text={s.title} delay={120} />
            {s.accent && (
              <>
                <br />
                <Words text={s.accent} className="accent" delay={260} />
              </>
            )}
          </h2>
        )}

        {s.lead && <p className="lead">{s.lead}</p>}
        <p className="body">{s.body}</p>

        {s.stat && (
          <p className="stat">
            <span className="stat-n">{s.stat[0]}</span>
            <span className="stat-l">{s.stat[1]}</span>
          </p>
        )}

        {s.meta && (
          <ul className="meta">
            {s.meta.map((m, k) => (
              <li key={m} style={{ transitionDelay: `${420 + k * 70}ms` }}>
                {m}
              </li>
            ))}
          </ul>
        )}

        {s.email && (
          <div className="contact">
            <a className="mail" href={`mailto:${s.email}`}>
              {s.email}
            </a>
            <ul className="socials">
              {s.socials.map(([label, href]) => (
                <li key={label}>
                  <a href={href} target="_blank" rel="noreferrer">
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}

export default function Overlay() {
  const [hint, setHint] = useState(false);
  const active = useSyncExternalStore(subscribe, getActive, () => 0);

  useEffect(() => {
    const t = setTimeout(() => setHint(true), 1600);
    return () => clearTimeout(t);
  }, []);

  return (
    <>
      <header className="topbar">
        <span className="mark">Prathvi</span>
        <span className="mark-sub">Editor · Motion · Brand</span>
      </header>

      <Progress />
      <Nav />

      <main className="scroller">
        {sections.map((s, i) => (
          <Panel key={s.id} s={s} i={i} />
        ))}
      </main>

      <div className={`hint ${hint && active === 0 ? 'show' : ''}`}>
        <span>Scroll</span>
        <i />
      </div>
    </>
  );
}
