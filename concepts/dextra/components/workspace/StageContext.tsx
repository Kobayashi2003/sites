import { createContext, useContext } from 'react';
import { createPortal } from 'react-dom';
import type { ReactNode } from 'react';
type Stage = {
  controls: HTMLDivElement | null;
  playback: HTMLDivElement | null;
  expanded: boolean;
  toggle: () => Promise<void>;
};
export const StageContext = createContext<Stage>({
  controls: null,
  playback: null,
  expanded: false,
  toggle: async () => {},
});
export function StageControls({
  children,
  slot = 'controls',
}: {
  children: ReactNode;
  slot?: 'controls' | 'playback';
}) {
  const stage = useContext(StageContext);
  return stage[slot] ? createPortal(children, stage[slot]) : null;
}
export function useStage() {
  return useContext(StageContext);
}
