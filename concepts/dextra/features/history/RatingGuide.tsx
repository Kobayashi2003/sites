import s from './RatingGuide.module.css';

export default function RatingGuide() {
  return (
    <details className={s.explanation}>
      <summary>How rankings work</summary>
      <p>
        Only identical practice configurations share a personal best. Higher is
        better; scores rounded to two decimals are ties.
      </p>
      <dl>
        <div>
          <dt>Falling · Fixed & songs</dt>
          <dd>
            Accuracy %. Arcade points and rank remain available as session
            details.
          </dd>
        </div>
        <div>
          <dt>Static · Fixed & timed</dt>
          <dd>
            Completed groups × 60 ÷ active seconds × accuracy². Timed runs use
            the full selected time limit. “eff/min” means accuracy-adjusted
            groups per minute.
          </dd>
        </div>
        <div>
          <dt>Falling · Survival</dt>
          <dd>
            Survival seconds × accuracy². “eff s” means accuracy-adjusted
            survival seconds. Life counts and BPM have separate records.
          </dd>
        </div>
      </dl>
      <p>
        Accuracy is a fraction in these formulas: 90% becomes 0.9² = 0.81.
        Pauses and the lead-in do not count. Static BPM, note value and
        judgement windows do not affect its ranking. Colors, volume and scroll
        speed are excluded.
      </p>
      <p>
        Random runs compare the same generation settings; their individual
        charts vary. Older records without a configuration snapshot remain
        viewable but cannot set a personal best.
      </p>
    </details>
  );
}
