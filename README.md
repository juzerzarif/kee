# kee

A stateless keyboard event matcher for the browser. Checks if a `KeyboardEvent` matches a combo string like `Control+a`, `CmdOrCtrl+Shift+s`, or `?Shift+Alt+ArrowUp`.

kee abstracts away a lot of the platform specific quirks of keyboard event reporting and attempts to provide reasonable "expected" behavior while making sane compromises.

## Install

```bash
npm install @jzarif/kee
```

## Usage

```ts
import { match, matchCode } from '@jzarif/kee';

document.addEventListener('keydown', (event) => {
  if (match(event, 'CmdOrCtrl+s')) {
    event.preventDefault();
    save();
  }

  if (match(event, 'Control+Shift+z')) {
    redo();
  }

  // matchCode matches on physical key position instead of character
  if (matchCode(event, 'Control+KeyA')) {
    selectAll();
  }
});
```

## API

### `match(event, combo, options?)`

Matches a keyboard event against a combo string, using the character the key produces on the user's keyboard layout. Handles edge cases like shifted keys producing different characters, MacOS Alt generating special characters, and international layouts. This is the right choice for most applications (with some important [caveats](#caveats-when-using-match)).

### `matchCode(event, combo, options?)`

Matches against `event.code` (the physical key position). Use this when you care about where a key is on the keyboard rather than what character it produces (e.g., WASD movement in a game). See https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/code.

### Options

```ts
interface MatchOptions {
  strictModifiers?: boolean;
}
```

- **`strictModifiers`**

  By default, extra modifiers are ignored: `Control+a` matches even if Shift is also held. Set `strictModifiers: true` to reject events with modifiers not listed in the combo.

## Combo string format

A combo is one or more modifiers joined by `+`, followed by a key:

```
[?]Modifier+[?]Modifier+Key
```

### Modifiers

| Modifier    | Description                                                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `Control`   | Control key                                                                                                                        |
| `Shift`     | Shift key                                                                                                                          |
| `Alt`       | Alt / Option key                                                                                                                   |
| `Meta`      | Cmd on MacOS, Win key on Windows                                                                                                   |
| `CmdOrCtrl` | Cmd on MacOS/iOS/iPadOS, Control elsewhere                                                                                         |
| `Command`   | Cmd on MacOS only, never matches on other platforms. Useful in cases where MacOS has special platform shortcuts like Cmd+Backspace |

### Optional modifiers

Prefix a modifier with `?` to make it optional. This is useful with `strictModifiers`:

```ts
// Matches Control+A with or without Shift, but rejects if Alt or Meta is held
match(event, '?Shift+Control+a', { strictModifiers: true });
```

Without `strictModifiers`, all unmentioned modifiers are already optional, so `?` has no effect.

### Keys

Always use the **unshifted** (bottom character on a keyboard key) character for keys with shifted variants:

```
Shift+2       (not Shift+@)
Shift+`       (not Shift+~)
Shift+;       (not Shift+:)
Control+a     (not Control+A)
```

For non-character keys, use the standard `KeyboardEvent.key` name:

```
Enter, Escape, ArrowUp, ArrowDown, Backspace, Tab, Delete, Home, End, etc.
```

There are two additional key values supported: `Space`, and `Plus`. Note that on US layout keyboards, the `+` key is usually the shifted equivalent of the `=` key and so the combo should use `=` instead in that case.

## Caveats when using `match()`

1. **MacOS Alt combos with `match()` are problematic.**

   On MacOS, Alt (Option) modifies `event.key` to produce special characters (e.g., Alt+A produces `å`). kee resolves these back to the base key, but the character map is based on the US layout. On non-US Mac layouts, Alt+letter combos may not resolve correctly.

   Additionally Alt+\`, Alt+e, Alt+i, Alt+n, and Alt+u on MacOS produce ["dead" keys](https://developer.mozilla.org/en-US/docs/Web/API/UI_Events/Keyboard_event_key_values#common_ime_keys). These can be identified on browsers with the [Keyboard](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard) API is available; on other browsers they cannot be matched with `match()`.

2. **Shifted digit/punctuation matching across keyboard layouts.**

   When Shift transforms a non-alpha key (e.g `Shift+2 -> @`, `Shift+; -> :`), kee tries to determine the correct base key. On browsers without the [Keyboard](https://developer.mozilla.org/en-US/docs/Web/API/Keyboard) API kee relies on `event.code` for digit (0-9) keys (since they're almost always in the same physical location on most keyboards) and an internal mapping for symbol keys (like `[`, `=`, etc.). That mapping is US layout specific and may not work on keyboards with other localized layouts.

## License

MIT
