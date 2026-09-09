import Link from 'next/link';
import { meta } from './meta';
import styles from './styles.module.css';

const programme = [
  ['Sep 12', 'La Notte', 'Michelangelo Antonioni · 1961'],
  ['Sep 13', 'Daughters of the Dust', 'Julie Dash · 1991'],
  ['Sep 14', 'The Long Goodbye', 'Robert Altman · 1973'],
];

function AfterDark() {
  return (
    <main className={styles.site}>
      <header className={styles.header}>
        <Link href="/" aria-label="Back to Site Atlas" className={styles.brand}>AFTER DARK</Link>
        <span>Repertory cinema · Screen 02</span><button type="button">Menu</button>
      </header>
      <section className={styles.hero}>
        <div className={styles.frame} aria-hidden="true"><span>AD</span><i /></div>
        <p className={styles.issue}>Programme No. 09<br />September 2026</p>
        <h1>Films for<br />the <em>restless.</em></h1>
        <p className={styles.synopsis}>Three nights on cities, memory, and people who refuse to go home.</p>
      </section>
      <section className={styles.programme}>
        <p className={styles.label}>This week</p>
        <ol>{programme.map(([date, title, credit], index) => <li key={title}><span>{date}</span><div><small>0{index + 1}</small><h2>{title}</h2><p>{credit}</p></div><a href="#tickets" aria-label={`Tickets for ${title}`}>Tickets ↗</a></li>)}</ol>
      </section>
      <section className={styles.membership} id="tickets"><span>Late light.<br />Good films.</span><div><p>One membership. Every screening. A seat kept for you until ten minutes before curtain.</p><a href="mailto:cinema@example.com">Join the night →</a></div></section>
      <footer className={styles.footer}><span>45 Rue de Minuit</span><span>Doors 18:30 / Curtain 19:00</span><span>Concept study · 2026</span></footer>
    </main>
  );
}

export const concept = { ...meta, Component: AfterDark };
