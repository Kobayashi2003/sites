/** Six-lane exercise sequences from In Falsus Hanon; see ../features/hanon/SOURCES.md. */
export const hanonPatterns = [
  ['01', '13456543', '64321234'],
  ['02', '13654543', '63123234'],
  ['03', '13654345', '63123432'],
  ['04', '12136543', '65631234'],
  ['05', '16564534', '12132435'],
  ['06', '16564636', '61213141'],
  ['07', '13243543', '64534234'],
  ['08', '13564534', '64213243'],
  ['09', '13435465', '64342312'],
  ['10', '16543434', '61234343'],
  ['11', '13656545', '63121232'],
  ['12', '51321231', '16456546'],
  ['13', '31425345', '46354234'],
  ['14', '12434354', '65343423'],
  ['15', '13243546', '64534231'],
  ['16', '13236545', '63431232'],
  ['18', '12435423', '65342354'],
  ['19', '16456435', '61321342'],
] as const;
export type HanonConfig = {
  queue: string[];
  repeat: number;
  division: 4 | 8 | 16;
  traversal: 'both' | 'up' | 'down';
};
export const defaultHanon: HanonConfig = {
  queue: ['01', '02', '03'],
  repeat: 2,
  division: 16,
  traversal: 'both',
};
export const MAX_QUEUE = 24;
export const MAX_REPEAT = 16;
export function validHanon(value: unknown): value is HanonConfig {
  if (!value || typeof value !== 'object') return false;
  const c = value as HanonConfig;
  return (
    Array.isArray(c.queue) &&
    c.queue.length > 0 &&
    c.queue.length <= MAX_QUEUE &&
    c.queue.every((id) => hanonPatterns.some((p) => p[0] === id)) &&
    Number.isInteger(c.repeat) &&
    c.repeat >= 1 &&
    c.repeat <= MAX_REPEAT &&
    [4, 8, 16].includes(c.division) &&
    ['both', 'up', 'down'].includes(c.traversal)
  );
}
export type HanonStep = {
  lanes: number[];
  exercise: string;
  position: number;
  direction: 'up' | 'down';
  repetition: number;
};
/** Summary counts do not need to allocate the full practice chart. */
export function hanonNoteCount(config: HanonConfig) {
  return validHanon(config)
    ? config.queue.length *
        config.repeat *
        8 *
        (config.traversal === 'both' ? 2 : 1)
    : 0;
}
/** Traversal is a musical pattern direction, independent of chart scroll direction. */
export function hanonSteps(config: HanonConfig): HanonStep[] {
  if (!validHanon(config)) return [];
  return config.queue.flatMap((id, position) => {
    const pattern = hanonPatterns.find((p) => p[0] === id)!;
    const directions: ('up' | 'down')[] =
      config.traversal === 'both' ? ['up', 'down'] : [config.traversal];
    return directions.flatMap((direction) =>
      Array.from({ length: config.repeat }, (_, r) =>
        pattern[direction === 'up' ? 1 : 2].split('').map((lane) => ({
          lanes: [Number(lane) - 1],
          exercise: id,
          position,
          direction,
          repetition: r + 1,
        })),
      ).flat(),
    );
  });
}
export function hanonInterval(bpm: number, division: HanonConfig['division']) {
  return ((60000 / bpm) * 4) / division;
}
