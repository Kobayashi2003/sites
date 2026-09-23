import Link from 'next/link';
import Icon from '../ui/Icon';
import Select from '../ui/Select';
import CountBadge from '../ui/CountBadge';
import s from './WorkspaceHeader.module.css';

export type Theme = 'system' | 'light' | 'dark';

export default function WorkspaceHeader({
  theme,
  historyCount,
  onThemeChange,
  onHistory,
  onSettings,
}: {
  theme: Theme;
  historyCount: number;
  onThemeChange: (theme: Theme) => void;
  onHistory: () => void;
  onSettings: () => void;
}) {
  return (
    <header className={s.header}>
      <Link href="/concepts/dextra" className={s.brand}>
        <span aria-hidden="true">≋</span>
        <strong>
          DEXTRA<span className={s.brandSuffix}> / SIX</span>
        </strong>
      </Link>
      <span className={s.identity}>LEFT-HAND RHYTHM STUDIO</span>
      <div className={s.actions}>
        <Select
          label="Color theme"
          icon="theme"
          value={theme}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          onChange={(value) => onThemeChange(value as Theme)}
        />
        <button onClick={onHistory}>
          <Icon name="history" />
          History <CountBadge>{historyCount}</CountBadge>
        </button>
        <button onClick={onSettings}>
          <Icon name="settings" />
          Settings
        </button>
      </div>
    </header>
  );
}
