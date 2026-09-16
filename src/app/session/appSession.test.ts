import { describe, expect, it } from 'vitest';

import { selectionsEqual, singleSelection } from './appSession';

describe('application selection', () => {
  it('treats equivalent semantic selections as equal', () => {
    expect(selectionsEqual(singleSelection({ kind: 'conductor', id: 'WIRE_MOTOR_POS' }), singleSelection({ kind: 'conductor', id: 'WIRE_MOTOR_POS' }))).toBe(true);
  });

  it('distinguishes the same ID in different semantic namespaces', () => {
    expect(selectionsEqual(singleSelection({ kind: 'route', id: 'shared' }), singleSelection({ kind: 'conductor', id: 'shared' }))).toBe(false);
  });
});
