import { describe, expect, it, vi } from 'vitest';
import { match, matchCode } from '../kee';
import type { MatchOptions } from '../kee';

function testWith(opts: {
  matcher?: typeof match | typeof matchCode;
  combo: string | [string, MatchOptions?];
  event: KeyboardEventInit;
  matches: boolean;
}) {
  const { matcher = match, combo, event: eventInit, matches } = opts;
  const event = new KeyboardEvent('keydown', eventInit);
  const matchArgs = Array.isArray(combo) ? combo : ([combo] as [string, MatchOptions?]);
  expect(matcher(event, ...matchArgs)).toBe(matches);
}

describe('combo parsing', () => {
  it('should throw an error if the combo is empty', () => {
    expect(() => match(new KeyboardEvent('keydown'), ' ')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid key combination ' '. Key value cannot be empty. If you intended to specify the space key, use the key name 'Space' instead.]`,
    );
  });

  it('should throw an error if the combo is incomplete (ends/starts with a +)', () => {
    expect(() =>
      match(new KeyboardEvent('keydown'), 'Control+'),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid key combination 'Control+'. Key value cannot be empty. If you intended to specify the space key, use the key name 'Space' instead.]`,
    );
    expect(() => match(new KeyboardEvent('keydown'), '+a')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid key combination '+a'. Key value cannot be empty. If you intended to specify the space key, use the key name 'Space' instead.]`,
    );
  });

  it('should throw an error if the combo includes an empty key in the middle', () => {
    expect(() =>
      match(new KeyboardEvent('keydown'), 'Control+ +a'),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid key combination 'Control+ +a'. Key value cannot be empty. If you intended to specify the space key, use the key name 'Space' instead.]`,
    );
  });

  it('should throw an error if the combo includes an optional base key', () => {
    expect(() => match(new KeyboardEvent('keydown'), '?a')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid key combination '?a'. Non-modifier key 'a' cannot be optional.]`,
    );
  });

  it('should throw an error if the combo includes multiple non-modifier keys', () => {
    expect(() => match(new KeyboardEvent('keydown'), 'a+b')).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid key combination 'a+b'. Combination cannot have more than one non-modifier key.]`,
    );
  });

  it('should throw an error if the combo includes multiple of the same modifier', () => {
    expect(() =>
      match(new KeyboardEvent('keydown'), 'Control+?Control+a'),
    ).toThrowErrorMatchingInlineSnapshot(
      `[Error: Invalid key combination 'Control+?Control+a'. Combination cannot have multiple Control modifiers.]`,
    );
  });
});

describe('modifier matching', () => {
  it('should match a combo with just a modifier', () =>
    testWith({ combo: 'Control', event: { key: 'Control', ctrlKey: true }, matches: true }));

  it('should match a combo with a modifier+key', () =>
    testWith({ combo: 'Control+a', event: { key: 'a', ctrlKey: true }, matches: true }));

  it('should match a combo with multiple modifiers', () =>
    testWith({
      combo: 'Shift+Control+a',
      event: { key: 'a', shiftKey: true, ctrlKey: true },
      matches: true,
    }));

  it('should match a combo with modifiers when extra modifiers are present in the event', () =>
    testWith({
      combo: 'Control+a',
      event: { key: 'a', shiftKey: true, ctrlKey: true, altKey: true },
      matches: true,
    }));

  it('should match a combo with an optional modifier when that modifier is present or absent', () => {
    testWith({ combo: '?Control+a', event: { key: 'a', ctrlKey: true }, matches: true });
    testWith({ combo: '?Control+a', event: { key: 'a' }, matches: true });
  });

  it('should not match a combo with modifiers and the strictModifiers option when extra modifiers are present in the event', () =>
    testWith({
      combo: ['Control+a', { strictModifiers: true }],
      event: { key: 'a', shiftKey: true, ctrlKey: true, altKey: true },
      matches: false,
    }));

  it('should ignore the presence/absence of optional modifiers even when strictModifiers is true', () => {
    testWith({
      combo: ['?Control+a', { strictModifiers: true }],
      event: { key: 'a', ctrlKey: true },
      matches: true,
    });
    testWith({
      combo: ['?Control+a', { strictModifiers: true }],
      event: { key: 'a' },
      matches: true,
    });
  });

  it('should not match when strictModifiers is true and modifiers other than the optional modifier are present', () =>
    testWith({
      combo: ['?Control+a', { strictModifiers: true }],
      event: { key: 'a', shiftKey: true },
      matches: false,
    }));

  it('should match Command to the Meta modifier on MacOS', async () => {
    using _spy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    vi.resetModules();
    const local = await import('../kee');
    testWith({
      matcher: local.match,
      combo: 'Command+a',
      event: { key: 'a', metaKey: true },
      matches: true,
    });
  });

  it('should never match a combo with the Command modifier on non-MacOS platforms', async () => {
    using _spy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux');
    vi.resetModules();
    const local = await import('../kee');
    testWith({
      matcher: local.match,
      combo: 'Command+a',
      event: { key: 'a', shiftKey: true, ctrlKey: true, altKey: true, metaKey: true },
      matches: false,
    });
  });

  it('should match a combo with an optional Command modifier on non-MacOS platforms', async () => {
    using _spy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux');
    vi.resetModules();
    const local = await import('../kee');
    testWith({
      matcher: local.match,
      combo: '?Command+a',
      event: { key: 'a' },
      matches: true,
    });
  });

  it('should match CmdOrCtrl to the Meta modifier on MacOS', async () => {
    using _spy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    vi.resetModules();
    const local = await import('../kee');
    testWith({
      matcher: local.match,
      combo: 'CmdOrCtrl+a',
      event: { key: 'a', metaKey: true },
      matches: true,
    });
  });

  it('should match CmdOrCtrl to the Control modifier on non-MacOS platforms', async () => {
    using _spy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('Linux');
    vi.resetModules();
    const local = await import('../kee');
    testWith({
      matcher: local.match,
      combo: 'CmdOrCtrl+a',
      event: { key: 'a', ctrlKey: true },
      matches: true,
    });
  });
});

describe('key matching', () => {
  it('should match a combo with just a key', () =>
    testWith({ combo: 'a', event: { key: 'a' }, matches: true }));

  it('should use the keyboard layout API to match on event.code when available', async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      (navigator as any).keyboard = {
        getLayoutMap: () => Promise.resolve(new Map([['KeyA', 'a']])),
      };
      // reset module cache and re-import so the platform map can be evaluated again
      vi.resetModules();
      const local = await import('../kee');

      testWith({
        matcher: local.match,
        combo: 'Control+a',
        // make event.key something absurd because it shouldn't even be looking at event.key in this case
        event: { code: 'KeyA', key: 'NotARealKey', ctrlKey: true },
        matches: true,
      });
    } finally {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
      delete (navigator as any).keyboard;
    }
  });

  it('should use event.code to match combos with digit keys even when the keyboard layout API is not available', () =>
    testWith({
      combo: 'Control+1',
      event: { code: 'Digit1', key: '!', ctrlKey: true },
      matches: true,
    }));

  it('should match an Alt+<key> combo on MacOS that produces an "alternate" character for event.key', async () => {
    using _spy = vi.spyOn(navigator, 'platform', 'get').mockReturnValue('MacIntel');
    vi.resetModules();
    const local = await import('../kee');

    testWith({
      matcher: local.match,
      combo: 'Alt+a',
      event: { key: 'å', altKey: true },
      matches: true,
    });
  });

  it('should match a Shift+<symbol> combo that produces a different "shifted" character for event.key', () =>
    testWith({ combo: 'Shift+=', event: { key: '+', shiftKey: true }, matches: true }));

  it('should match a combo with the Space key to an even.key value of a single space character', () =>
    testWith({ combo: 'Control+Space', event: { key: ' ', ctrlKey: true }, matches: true }));

  it('should match a combo with the Plus key to an event.key value of "+"', () =>
    testWith({ combo: 'Control+Plus', event: { key: '+', ctrlKey: true }, matches: true }));
});

describe('matchCode', () => {
  it('should match on event.code instead of event.key', () =>
    testWith({
      matcher: matchCode,
      combo: 'Control+KeyA',
      event: { code: 'KeyA', key: 'b', ctrlKey: true },
      matches: true,
    }));
});
