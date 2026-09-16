import { programs } from '../../engine/rhythm';
import type { ProgramId } from '../../engine/rhythm';
import s from '../../styles.module.css';
type Props = {
  busy: boolean;
  challenge: 'standard' | 'endless';
  program: ProgramId;
  loadProgram: (id: ProgramId) => void;
};
export default function LibraryPanel({
  busy,
  challenge,
  program,
  loadProgram,
}: Props) {
  return (
    <>
      <p className={s.drawerIntro}>
        Choose what to train. Every plan loads into the same six-lane Practice
        chart.
      </p>
      {busy && (
        <p className={s.drawerWarning}>
          Paused. Load a plan to start a new run.
        </p>
      )}
      <div className={s.planList}>
        {programs.map((p) => (
          <article
            key={p.id}
            data-loaded={
              p.id === (challenge === 'endless' ? 'random' : program)
            }
          >
            <div className={s.planListTitle}>
              <span>{p.tag}</span>
              {p.id === (challenge === 'endless' ? 'random' : program) && (
                <b>Loaded</b>
              )}
            </div>
            <h3>{p.name}</h3>
            <p>{p.description}</p>
            <div>
              <small>32 groups · Both formats</small>
              <button onClick={() => loadProgram(p.id)}>
                {busy
                  ? 'End & load'
                  : p.id === (challenge === 'endless' ? 'random' : program)
                    ? 'Reload'
                    : 'Load'}{' '}
                <span aria-hidden="true">↗</span>
              </button>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
