/** Hand focus to the counterpart toggle once a panel has folded or unfolded. */
export function focusPanelToggle(panelId: string, className: string) {
  requestAnimationFrame(() =>
    document
      .getElementById(panelId)
      ?.querySelector<HTMLElement>(`.${CSS.escape(className)}`)
      ?.focus(),
  );
}
