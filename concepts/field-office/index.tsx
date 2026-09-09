import Link from 'next/link';
import { meta } from './meta';
import styles from './styles.module.css';

function FieldOffice() {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <Link href="/" className={styles.brand} aria-label="Back to Site Atlas">FIELD<br />OFFICE</Link>
        <nav aria-label="Primary navigation"><a href="#practice">Practice</a><a href="#work">Work</a><a href="#contact">Contact</a></nav>
        <span className={styles.place}>45.5019° N<br />73.5674° W</span>
      </header>
      <section className={styles.hero}>
        <p className={styles.overline}>Landscape architecture / Montréal</p>
        <h1>Ground,<br />considered.</h1>
        <div className={styles.orbit} aria-hidden="true"><span>Land · Water · City · Field · </span></div>
        <p className={styles.statement}>We shape public landscapes around what is already moving: water, people, seasons, and time.</p>
      </section>
      <section className={styles.practice} id="practice">
        <p className={styles.label}>01 / Practice</p>
        <p className={styles.lead}>Field Office works between ecology and public life. We design places that become more useful—and more alive—as they age.</p>
        <div className={styles.services}><span>Urban landscapes</span><span>Ecological restoration</span><span>Public realm strategy</span></div>
      </section>
      <section className={styles.work} id="work">
        <div className={styles.project}><span>2026 · Québec</span><h2>River<br />Commons</h2><p>Reconnecting a post-industrial edge with seasonal wetlands.</p></div>
        <div className={styles.project}><span>2025 · Montréal</span><h2>Canal<br />Rooms</h2><p>A sequence of shaded civic rooms along the water.</p></div>
      </section>
      <footer className={styles.footer} id="contact"><p>Start a conversation</p><a href="mailto:studio@example.com">studio@example.com ↗</a><span>Concept study · 2026</span></footer>
    </main>
  );
}

export const concept = { ...meta, Component: FieldOffice };
