// #region constants

const IS_MAC = typeof navigator !== 'undefined' && /mac|iphone/i.test(navigator.platform);

// Pressing Alt+<key> or Alt+Shift+<key> on MacOS produces "special" characters (e.g. Alt+a -> å).
// This maps them back to the base key that produced them (so å -> a). Only works for US layout
// MacOS keyboards.
const BASE_KEY_FOR_MACOS_ALT_CHAR = new Map(
  // prettier-ignore
  Object.entries({
    0: ['\u00ba', '\u201a'],    // º ‚
    1: ['\u00a1', '\u2044'],    // ¡ ⁄
    2: ['\u2122', '\u20ac'],    // ™ €
    3: ['\u00a3', '\u2039'],    // £ ‹
    4: ['\u00a2', '\u203a'],    // ¢ ›
    5: ['\u221e', '\ufb01'],    // ∞ ﬁ
    6: ['\u00a7', '\ufb02'],    // § ﬂ
    7: ['\u00b6', '\u2021'],    // ¶ ‡
    8: ['\u2022', '\u00b0'],    // • °
    9: ['\u00aa', '\u00b7'],    // ª ·
    'a': ['\u00e5', '\u00c5'],  // å Å
    'b': ['\u222b', '\u0131'],  // ∫ ı
    'c': ['\u00e7', '\u00c7'],  // ç Ç
    'd': ['\u2202', '\u00ce'],  // ∂ Î
    'e': ['\u00b4'],            // ´
    'f': ['\u0192', '\u00cf'],  // ƒ Ï
    'g': ['\u00a9', '\u02dd'],  // © ˝
    'h': ['\u02d9', '\u00d3'],  // ˙ Ó
    'i': ['\u02c6'],            // ˆ
    'j': ['\u2206', '\u00d4'],  // ∆ Ô
    'k': ['\u02da', '\uf8ff'],  // ˚ 
    'l': ['\u00ac', '\u00d2'],  // ¬ Ò
    'm': ['\u00b5', '\u00c2'],  // µ Â
    'n': ['\u02dc'],            // ˜
    'o': ['\u00f8', '\u00d8'],  // ø Ø
    'p': ['\u03c0', '\u220f'],  // π ∏
    'q': ['\u0153', '\u0152'],  // œ Œ
    'r': ['\u00ae', '\u2030'],  // ® ‰
    's': ['\u00df', '\u00cd'],  // ß Í
    't': ['\u2020', '\u02c7'],  // † ˇ
    'u': ['\u00a8'],            // ¨
    'v': ['\u221a', '\u25ca'],  // √ ◊
    'w': ['\u2211', '\u201e'],  // ∑ „
    'x': ['\u2248', '\u02db'],  // ≈ ˛
    'y': ['\u00a5', '\u00c1'],  // ¥ Á
    'z': ['\u03a9', '\u00b8'],  // Ω ¸
    '`': ['\u0060'],            // `
    '-': ['\u2013', '\u2014'],  // – —
    '=': ['\u2260', '\u00b1'],  // ≠ ±
    '[': ['\u201c', '\u201d'],  // “ ”
    ']': ['\u2018', '\u2019'],  // ‘ ’
    '\\': ['\u00ab', '\u00bb'], // « »
    ';': ['\u2026', '\u00da'],  // … Ú
    "'": ['\u00e6', '\u00c6'],  // æ Æ
    ',': ['\u2264', '\u00af'],  // ≤ ¯
    '.': ['\u2265', '\u02d8'],  // ≥ ˘
    '/': ['\u00f7', '\u00bf'],  // ÷ ¿
    ' ': ['\u00a0'],            //
  }).flatMap(([baseKey, altChars]) => altChars.map((altChar) => [altChar, baseKey])),
);

// Pressing the Shift key changes the event.key value for symbols (e.g. Shift+` -> ~) in a way where
// the base key that produced that value is not trivially identifiable (unlike in alpha keys where
// you can just .toLowerCase() it). This maps those "shifted" symbol keys to their base keys. Only
// works for US layout keyboards.
const BASE_KEY_FOR_SHIFTED_CHAR = new Map([
  ['~', '`'],
  ['_', '-'],
  ['+', '='],
  ['{', '['],
  ['}', ']'],
  ['|', '\\'],
  [':', ';'],
  ['"', "'"],
  ['<', ','],
  ['>', '.'],
  ['?', '/'],
]);

// Stores an inverted KeyboardLayoutMap
// (https://developer.mozilla.org/en-US/docs/Web/API/KeyboardLayoutMap) on browsers that support the
// navigator.keyboard API (chromium only at time of writing) If navigator.keyboard isn't available,
// defaults to a hardcoded map for just numeric keys because they are almost always in the same
// physical location on any keyboard.
let PLATFORM_CODE_MAP = new Map([
  ['1', 'Digit1'],
  ['2', 'Digit2'],
  ['3', 'Digit3'],
  ['4', 'Digit4'],
  ['5', 'Digit5'],
  ['6', 'Digit6'],
  ['7', 'Digit7'],
  ['8', 'Digit8'],
  ['9', 'Digit9'],
  ['0', 'Digit0'],
]);
void (async function loadKeyboardLayoutMapIfAvailable() {
  if (typeof navigator === 'undefined' || !('keyboard' in navigator)) {
    return;
  }
  try {
    interface Keyboard {
      getLayoutMap(): Promise<Map<string, string>>;
    }
    const keyboardLayoutMap = await (navigator.keyboard as Keyboard).getLayoutMap();
    PLATFORM_CODE_MAP = new Map();
    for (const [code, key] of keyboardLayoutMap.entries()) {
      PLATFORM_CODE_MAP.set(key.toLowerCase(), code);
    }
  } catch {
    // keyboard API not available - skip
  }
})();

const NATIVE_MODIFIERS = ['Shift', 'Control', 'Alt', 'Meta'] as const;
const KEE_MODIFIERS = ['CmdOrCtrl', 'Command'] as const;
const ALL_MODIFIERS = [...NATIVE_MODIFIERS, ...KEE_MODIFIERS] as const;
const NATIVE_VARIANT_FOR_MODIFIER = {
  Shift: 'Shift',
  Control: 'Control',
  Alt: 'Alt',
  Meta: 'Meta',
  CmdOrCtrl: IS_MAC ? 'Meta' : 'Control',
  Command: IS_MAC ? 'Meta' : undefined,
} as const;

// #endregion

// #region private

class KeeParseError extends Error {
  constructor(combo: string, message: string) {
    super(`Invalid key combination '${combo}'. ${message}`);
  }
}

function parseCombo(combo: string) {
  const keys = combo.split('+').map((s) => s.trim());

  let unmatchable = false;
  let baseKey = '';
  const modifiers: Record<string, { optional: boolean }> = {};
  for (let key of keys) {
    const optional = key.startsWith('?');
    key = optional ? key.substring(1) : key;
    if (!key) {
      throw new KeeParseError(
        combo,
        "Key value cannot be empty. If you intended to specify the space key, use the key name 'Space' instead.",
      );
    }

    const modifier = ALL_MODIFIERS.find((mod) => mod.toLowerCase() === key.toLowerCase());
    if (modifier) {
      const nativeMod = NATIVE_VARIANT_FOR_MODIFIER[modifier];
      if (modifiers[nativeMod!]) {
        throw new KeeParseError(combo, `Combination cannot have multiple ${nativeMod} modifiers.`);
      }

      if (!nativeMod) {
        // If the non-standard modifier is required, this combo is unmatchable on this platform.
        // Otherwise we just silently ignore it.
        unmatchable = unmatchable || !optional;
      } else {
        modifiers[nativeMod] = { optional };
      }
    } else {
      if (optional) {
        throw new KeeParseError(combo, `Non-modifier key '${key}' cannot be optional.`);
      }
      if (baseKey) {
        throw new KeeParseError(combo, 'Combination cannot have more than one non-modifier key.');
      }
      baseKey = key.toLowerCase() === 'space' ? ' ' : key.toLowerCase() === 'plus' ? '+' : key;
    }
  }

  return { key: baseKey, modifiers, unmatchable };
}

function matchModifiers(
  event: KeyboardEvent,
  modifiers: Record<string, { optional: boolean }>,
  opts?: Pick<MatchOptions, 'strictModifiers'>,
) {
  const eventKeyForMod: Record<string, keyof KeyboardEvent> = {
    Shift: 'shiftKey',
    Control: 'ctrlKey',
    Alt: 'altKey',
    Meta: 'metaKey',
  };

  if (opts?.strictModifiers) {
    return NATIVE_MODIFIERS.every((modifier) => {
      const requestedMod = modifiers[modifier];
      const eventMod = !!event[eventKeyForMod[modifier]!];
      return !!requestedMod?.optional || eventMod === !!requestedMod;
    });
  } else {
    return Object.entries(modifiers).every(
      ([modifier, { optional }]) => optional || !!event[eventKeyForMod[modifier]!],
    );
  }
}

// #endregion

interface MatchOptions {
  strictModifiers?: boolean;
}

function match(event: KeyboardEvent, combo: string, opts?: MatchOptions) {
  const { key, modifiers: comboModifiers, unmatchable } = parseCombo(combo);
  if (unmatchable) {
    return false;
  }

  const comboKey = key.toLowerCase();

  const matchesModifiers = matchModifiers(event, comboModifiers, opts);
  // You're allowed to use a combo that is just a modifier like 'Control' and there won't be a
  // parsed key in that case
  if (!comboKey || !matchesModifiers) {
    return matchesModifiers;
  }

  // If the navigator.keyboard API is available, use it to match on the more stable event.code
  // value instead.
  const platformCodeForComboKey = PLATFORM_CODE_MAP.get(comboKey);
  if (platformCodeForComboKey) {
    return platformCodeForComboKey === event.code;
  }

  return !!(
    comboKey === event.key.toLowerCase() ||
    (IS_MAC && event.altKey && comboKey === BASE_KEY_FOR_MACOS_ALT_CHAR.get(event.key)) ||
    (event.shiftKey && comboKey === BASE_KEY_FOR_SHIFTED_CHAR.get(event.key))
  );
}

function matchCode(event: KeyboardEvent, combo: string, opts?: MatchOptions) {
  const { key: comboCode, modifiers, unmatchable } = parseCombo(combo);
  if (unmatchable) {
    return false;
  }

  return comboCode === event.code && matchModifiers(event, modifiers, opts);
}

export type Modifier = (typeof ALL_MODIFIERS)[number];
export type { MatchOptions };
export { match, matchCode };
