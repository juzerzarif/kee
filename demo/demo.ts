import { match, matchCode } from '../src/kee';

(function setupPlatformDisplay() {
  document.getElementsByClassName('platform-str').item(0)!.innerHTML = navigator.platform;
})();

const selectedMatcher = (function setupMatcherOptions() {
  const matcherOptions = document.getElementsByName('matcher') as NodeListOf<HTMLInputElement>;
  const matchOption = matcherOptions[0]!;
  matchOption.checked = true;
  return matchOption.checked ? 'match' : 'matchCode';
})();

const keyCombos = (function setupKeyboardCombinationsList() {
  interface KeyComboItem {
    combo: string;
    strictModifiers: boolean;
    setMatchResult: (result: { matched: boolean } | { error: unknown }) => void;
  }
  const keyCombos: KeyComboItem[] = [];

  const newComboForm = document.getElementById('new-combo-form')! as HTMLFormElement;
  newComboForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const data = new FormData(newComboForm);
    const combo = (data.get('combo')! as string).trim();
    const strictModifiers = data.get('strictModifiers') === 'on';

    if (combo) {
      const li = document.createElement('li');
      li.classList.add('combo-item');

      const comboSpan = document.createElement('span');
      comboSpan.classList.add('combo');
      comboSpan.innerHTML = combo + (strictModifiers ? '' : ' (strictModifiers)');
      li.appendChild(comboSpan);

      const errorSpan = document.createElement('span');
      errorSpan.classList.add('error');
      li.appendChild(errorSpan);

      const deleteButton = document.createElement('button');
      deleteButton.classList.add('delete');
      deleteButton.innerHTML = '&#x2715;';
      li.appendChild(deleteButton);
      deleteButton.addEventListener('click', () => {
        const thisItemIndex = keyCombos.indexOf(comboItem);
        keyCombos.splice(thisItemIndex, 1);
        li.remove();
      });

      const comboItem: KeyComboItem = {
        combo,
        strictModifiers,
        setMatchResult: (result) => {
          li.classList.remove('matched');
          errorSpan.innerHTML = '';
          if ('matched' in result) {
            if (result.matched) {
              li.classList.add('matched');
            }
          } else {
            // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
            errorSpan.innerHTML = `${result.error}`;
          }
        },
      };

      keyCombos.push(comboItem);
      document.getElementById('combo-list')!.appendChild(li);
      newComboForm.reset();
    }
  });

  return keyCombos;
})();

(function setupEventTargetInput() {
  const keydownTarget = document.getElementById('event-target') as HTMLInputElement;
  keydownTarget.addEventListener('keydown', (event) => {
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLInputElement).value = '';

    const eventDetails = document.getElementById('event-details')!;
    eventDetails.innerHTML = JSON.stringify(
      {
        code: event.code,
        key: event.key,
        shiftKey: event.shiftKey,
        ctrlKey: event.ctrlKey,
        altKey: event.ctrlKey,
        metaKey: event.metaKey,
      },
      undefined,
      2,
    ).replace(/({\n|\n})/g, '');

    keyCombos.forEach(({ combo, strictModifiers, setMatchResult }) => {
      try {
        const matcher = selectedMatcher === 'match' ? match : matchCode;
        const matched = matcher(event, combo, { strictModifiers });
        setMatchResult({ matched });
      } catch (error) {
        setMatchResult({ error });
      }
    });
  });
})();
