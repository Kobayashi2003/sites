export function createStatic(groups: number[][]) {
  return {
    groups: groups.map((lanes) => [...lanes]),
    index: 0,
    errors: 0,
    presses: 0,
    elapsed: 0,
    held: new Set<number>(),
    matched: new Set<number>(),
  };
}
export type StaticState = ReturnType<typeof createStatic>;
export function pressStatic(state: StaticState, lane: number) {
  if (state.index >= state.groups.length || state.held.has(lane)) return;
  state.held.add(lane);
  state.presses++;
  const target = state.groups[state.index];
  if (!target.includes(lane)) {
    state.errors++;
    return;
  }
  state.matched.add(lane);
  if (target.every((n) => state.held.has(n) && state.matched.has(n))) {
    state.index++;
    state.matched.clear();
  }
}
export function releaseStatic(state: StaticState, lane: number) {
  state.held.delete(lane);
  state.matched.delete(lane);
}
export function staticSummary(state: StaticState) {
  return {
    done: state.index === state.groups.length,
    errorRate: state.presses
      ? Math.round((state.errors / state.presses) * 1000) / 10
      : 0,
  };
}
