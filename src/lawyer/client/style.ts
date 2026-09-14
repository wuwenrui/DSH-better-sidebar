/** Product-owned styling, scoped to the material shelf and using host theme tokens. */
export const materialStyle = `
.lawyer-materials { box-sizing: border-box; height: 100%; min-height: 0; overflow: auto; padding: 20px; color: var(--dsw-alias-label-primary); background: var(--dsw-alias-bg-layer-1); font-family: var(--dsw-font-sans); font-size: 14px; line-height: 1.7; }
.lawyer-materials header { display: flex; align-items: start; justify-content: space-between; gap: 12px; margin-bottom: 20px; }
.lawyer-materials header strong { font-size: 20px; letter-spacing: -.02em; }
.lawyer-materials p { margin: 6px 0 14px; color: var(--dsw-alias-label-secondary); }
.lawyer-materials button { font: inherit; cursor: pointer; color: inherit; border: 1px solid var(--dsw-alias-border-l1); background: var(--dsw-alias-interactive-bg-hover); border-radius: 6px; padding: 5px 10px; }
.lawyer-materials button:disabled { opacity: .5; cursor: default; }
.lawyer-materials button:focus-visible,.lawyer-materials input:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 2px; }
.lawyer-materials nav { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-bottom: 14px; overflow-wrap: anywhere; }
.lawyer-materials input { box-sizing: border-box; width: 100%; padding: 9px 12px; border: 1px solid var(--dsw-alias-border-l1); border-radius: 6px; background: var(--dsw-alias-interactive-bg-hover); color: inherit; font: inherit; }
.lawyer-materials .lm-list { margin: 14px 0 24px; max-height: 38vh; overflow: auto; }
.lawyer-materials .lm-row { width: 100%; display: grid; grid-template-columns: 56px minmax(0, 1fr) auto; gap: 12px; align-items: center; text-align: left; border: 0; border-bottom: 1px solid var(--dsw-alias-border-l1); border-radius: 0; background: transparent; padding: 12px 4px; }
.lawyer-materials .lm-row:hover,.lawyer-materials .lm-row[aria-pressed=true] { background: var(--dsw-alias-interactive-bg-hover); }
.lawyer-materials .lm-kind { font-size: 11px; color: var(--dsw-alias-label-secondary); letter-spacing: .04em; }
.lawyer-materials .lm-name { overflow-wrap: anywhere; }
.lawyer-materials .lm-preview { border-top: 2px solid var(--dsw-alias-border-l1); padding-top: 16px; }
.lawyer-materials .lm-preview-heading { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 14px; }
.lawyer-materials .lm-preview-heading strong { overflow-wrap: anywhere; }
.lawyer-materials .lm-preview-heading button { flex-shrink: 0; }
.lawyer-materials pre { white-space: pre-wrap; overflow-wrap: anywhere; font: inherit; line-height: 1.9; user-select: text; }
.lawyer-materials img { display: block; max-width: 100%; height: auto; }
.lawyer-materials iframe { width: 100%; height: 65vh; border: 0; }
`
