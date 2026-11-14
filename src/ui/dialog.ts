// Notebook dialogs (GDD 15.1): a parchment page over the game for confirming
// a choice, showing a save code to copy or taking a pasted code. Built in the
// page, not on the canvas, so phones get their own keyboard and copy menu.

import { FONTS } from '../data/fonts';
import { PALETTE } from '../data/palette';
import { playSound } from '../audio/sfx';

export interface DialogOptions {
  readonly title: string;
  readonly text?: string;
  /** A text box: shown read-only for a code to copy, editable for a code to paste. */
  readonly field?: { readonly value?: string; readonly readOnly?: boolean; readonly placeholder?: string };
  /** Buttons, first one the main choice. */
  readonly buttons: readonly string[];
}

export interface DialogResult {
  /** Index of the button pressed, or -1 when dismissed. */
  readonly button: number;
  readonly value: string;
}

function style(element: HTMLElement, rules: Partial<CSSStyleDeclaration>): void {
  Object.assign(element.style, rules);
}

/** Opens a dialog and resolves when the player picks a button or dismisses it. */
export function openDialog(options: DialogOptions): Promise<DialogResult> {
  return new Promise((resolve) => {
    const backdrop = document.createElement('div');
    style(backdrop, {
      position: 'fixed',
      inset: '0',
      background: 'rgba(42, 33, 24, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '50',
      padding: '16px',
    });
    const page = document.createElement('div');
    page.setAttribute('role', 'dialog');
    page.setAttribute('aria-modal', 'true');
    style(page, {
      background: PALETTE.parchment,
      color: PALETTE.ink,
      border: `4px solid ${PALETTE.ink}`,
      outline: `2px solid ${PALETTE.brass}`,
      outlineOffset: '-10px',
      padding: '28px 32px',
      maxWidth: '640px',
      width: '100%',
      fontFamily: `"${FONTS.body}", sans-serif`,
      fontSize: '18px',
      boxSizing: 'border-box',
    });
    const title = document.createElement('h2');
    title.textContent = options.title;
    style(title, { fontFamily: `"${FONTS.heading}", serif`, fontWeight: '400', fontSize: '30px', margin: '0 0 12px' });
    page.appendChild(title);
    if (options.text) {
      const text = document.createElement('p');
      text.textContent = options.text;
      style(text, { margin: '0 0 16px', lineHeight: '1.35' });
      page.appendChild(text);
    }
    let field: HTMLTextAreaElement | undefined;
    if (options.field) {
      field = document.createElement('textarea');
      field.value = options.field.value ?? '';
      field.readOnly = options.field.readOnly ?? false;
      field.placeholder = options.field.placeholder ?? '';
      field.rows = 5;
      field.spellcheck = false;
      style(field, {
        width: '100%',
        boxSizing: 'border-box',
        fontFamily: 'monospace',
        fontSize: '13px',
        background: '#E9DFC8',
        color: PALETTE.ink,
        border: `2px solid ${PALETTE.ink}`,
        padding: '8px',
        marginBottom: '16px',
        wordBreak: 'break-all',
      });
      page.appendChild(field);
    }
    const row = document.createElement('div');
    style(row, { display: 'flex', gap: '12px', justifyContent: 'flex-end', flexWrap: 'wrap' });
    const close = (button: number): void => {
      playSound('click');
      document.removeEventListener('keydown', onKey, true);
      backdrop.remove();
      resolve({ button, value: field?.value ?? '' });
    };
    const onKey = (event: KeyboardEvent): void => {
      // Keys stay with the dialog while it is open.
      event.stopPropagation();
      if (event.key === 'Escape') close(-1);
    };
    options.buttons.forEach((label, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      style(button, {
        fontFamily: `"${FONTS.heading}", serif`,
        fontSize: '22px',
        minHeight: '48px',
        minWidth: '120px',
        padding: '6px 18px',
        background: PALETTE.parchment,
        color: PALETTE.ink,
        border: `${index === 0 ? 4 : 3}px solid ${index === 0 ? PALETTE.playerEffects : PALETTE.ink}`,
        cursor: 'pointer',
      });
      button.addEventListener('click', () => close(index));
      row.appendChild(button);
    });
    page.appendChild(row);
    backdrop.appendChild(page);
    backdrop.addEventListener('pointerdown', (event) => {
      if (event.target === backdrop) close(-1);
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(backdrop);
    if (field) {
      field.focus();
      if (field.readOnly) field.select();
    } else {
      (row.firstChild as HTMLButtonElement | null)?.focus();
    }
  });
}
