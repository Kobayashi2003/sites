import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createStatic as createState,
  pressStatic,
  releaseStatic,
  staticSummary,
} from './static.ts';
import { createRhythm } from './rhythm.ts';
const createStatic = (mapping, program) =>
  createState(createRhythm(60, mapping, program).notes.map((n) => n.lanes));
const mapping = [0, 0, 1, 2, 3, 4];
test('static rows do not expire; errors require a wrong fresh press', () => {
  const s = createStatic(mapping, 'isolation');
  s.elapsed = 90000;
  pressStatic(s, 5);
  pressStatic(s, 5);
  assert.equal(s.errors, 1);
  assert.equal(s.index, 0);
  releaseStatic(s, 5);
  pressStatic(s, 0);
  assert.equal(s.index, 1);
  pressStatic(s, 0);
  assert.equal(s.index, 1);
  assert.equal(staticSummary(s).errorRate, 50);
});
test('static chords require fresh overlapping keys and complete once', () => {
  const s = createStatic(mapping, 'chords');
  const [a, b] = s.groups[0];
  pressStatic(s, a);
  releaseStatic(s, a);
  pressStatic(s, b);
  assert.equal(s.index, 0);
  pressStatic(s, a);
  assert.equal(s.index, 1);
  releaseStatic(s, a);
  releaseStatic(s, b);
  for (const group of s.groups.slice(1)) {
    for (const n of group) pressStatic(s, n);
    for (const n of group) releaseStatic(s, n);
  }
  assert.equal(staticSummary(s).done, true);
  assert.equal(staticSummary(s).errorRate, 0);
  pressStatic(s, 5);
  assert.equal(s.errors, 0);
});

test('fast alternating presses accept overlap from the previous group', () => {
  const state = createState([[0], [1], [2], [0]]);
  pressStatic(state, 0);
  pressStatic(state, 1);
  pressStatic(state, 2);
  assert.equal(state.index, 3);
  pressStatic(state, 0);
  assert.equal(state.index, 3);
  releaseStatic(state, 0);
  pressStatic(state, 0);
  assert.equal(state.index, 4);
  assert.equal(state.errors, 0);
});
test('overlapping chords still require fresh presses for shared keys', () => {
  const state = createState([
    [0, 2],
    [2, 3],
  ]);
  pressStatic(state, 0);
  pressStatic(state, 2);
  pressStatic(state, 3);
  assert.equal(state.index, 1);
  releaseStatic(state, 2);
  pressStatic(state, 2);
  assert.equal(state.index, 2);
  assert.equal(state.errors, 0);
});
