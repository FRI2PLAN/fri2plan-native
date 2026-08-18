import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const patch = readFileSync(new URL('./react-native+0.81.5.patch', import.meta.url), 'utf8');

describe('Correctif Android ReactActivityDelegate', () => {
  it('protège onUserLeaveHint lorsque React n’est pas encore initialisé', () => {
    expect(patch).toContain('ReactActivityDelegate.java');
    expect(patch).toContain('final ReactDelegate reactDelegate = mReactDelegate;');
    expect(patch).toContain('if (reactDelegate != null) reactDelegate.onUserLeaveHint();');
    expect(patch).toContain('-    Objects.requireNonNull(mReactDelegate).onUserLeaveHint();');
    expect(patch).toContain('+    if (reactDelegate != null) reactDelegate.onUserLeaveHint();');
  });
});
