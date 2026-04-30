/**
 * Toolbar icons: official brand SVGs from simple-icons (CC0-1.0), except
 * `vscode` which keeps the detailed logo in `./vscode-toolbar-icon.js`.
 * @see https://github.com/simple-icons/simple-icons
 */
import {
  siClion,
  siCursor,
  siElectron,
  siGnuemacs,
  siGoland,
  siIntellijidea,
  siJetbrains,
  siNano,
  siNotepadplusplus,
  siPhpstorm,
  siPycharm,
  siRider,
  siRubymine,
  siSublimetext,
  siVim,
  siVscodium,
  siWebstorm,
  siZedindustries,
} from "simple-icons";
import { VSCODE_TOOLBAR_ICON } from "./vscode-toolbar-icon.js";

/** Renders any icon as solid white (Astro Dev Toolbar uses a dark bar). */
const DARK_TOOLBAR_FILTER = "filter:brightness(0) invert(1)";

export function toolbarIconForDarkBar(svg) {
  if (!svg || typeof svg !== "string") return svg;
  return svg.replace(/<svg\b([^>]*)>/, (full, attrs) => {
    const styleMatch = attrs.match(/\sstyle\s*=\s*"([^"]*)"/i);
    if (styleMatch) {
      const merged = `${styleMatch[1]};${DARK_TOOLBAR_FILTER}`;
      return `<svg${attrs.replace(/\sstyle\s*=\s*"[^"]*"/i, ` style="${merged}"`)}>`;
    }
    return `<svg${attrs} style="${DARK_TOOLBAR_FILTER}">`;
  });
}

/** Same vector as `vscode-toolbar-icon`, sized for the Dev Toolbar chip. */
function vscodeForToolbar() {
  return VSCODE_TOOLBAR_ICON.replace(/width="[^"]*"/, 'width="24"').replace(/height="[^"]*"/, 'height="24"');
}

/** @param {import("simple-icons").SimpleIcon} si */
function fromSimpleIcon(si) {
  return si.svg.replace("<svg ", '<svg width="24" height="24" ');
}

/** Fallback when simple-icons has no brand */
const ICON_GENERIC = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect width="24" height="24" rx="5" fill="#334155"/><path stroke="#94A3B8" stroke-width="1.6" stroke-linecap="round" d="M9 8 6 12l3 4M15 8l3 4-3 4"/></svg>`;

/**
 * VS Code Insiders (green) — simple-icons does not ship this trademark;
 * simplified ribbon inspired by the product mark.
 */
const VSCODE_INSIDERS_STANDIN = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path fill="#24BFA5" d="M17 4 6 12l11 8v-4.5L10.5 12 17 8.5V4Z"/><path fill="#1BA784" opacity=".55" d="m6 12 4.5-2V8L6 12Z"/></svg>`;

/** @type {Record<string, string>} */
const BY_EDITOR_ID = Object.freeze({
  vscode: vscodeForToolbar(),
  "vscode-insiders": VSCODE_INSIDERS_STANDIN,
  vscodium: fromSimpleIcon(siVscodium),
  codium: fromSimpleIcon(siVscodium),

  cursor: fromSimpleIcon(siCursor),
  zed: fromSimpleIcon(siZedindustries),
  atom: fromSimpleIcon(siElectron),
  brackets: ICON_GENERIC,
  sublime: fromSimpleIcon(siSublimetext),
  trae: ICON_GENERIC,
  antigravity: ICON_GENERIC,

  appcode: fromSimpleIcon(siJetbrains),
  clion: fromSimpleIcon(siClion),
  idea: fromSimpleIcon(siIntellijidea),
  phpstorm: fromSimpleIcon(siPhpstorm),
  pycharm: fromSimpleIcon(siPycharm),
  rubymine: fromSimpleIcon(siRubymine),
  webstorm: fromSimpleIcon(siWebstorm),
  goland: fromSimpleIcon(siGoland),
  rider: fromSimpleIcon(siRider),

  vim: fromSimpleIcon(siVim),
  gvim: fromSimpleIcon(siVim),
  macvim: fromSimpleIcon(siVim),
  emacs: fromSimpleIcon(siGnuemacs),
  emacsclient: fromSimpleIcon(siGnuemacs),
  nano: fromSimpleIcon(siNano),
  joe: ICON_GENERIC,

  notepadplusplus: fromSimpleIcon(siNotepadplusplus),
  textmate: ICON_GENERIC,
  mine: ICON_GENERIC,
  rmate: ICON_GENERIC,
});

/**
 * SVG toolbar icon for `editorId`, tuned white for Astro’s dark Dev Toolbar.
 * @param {string} editorId
 */
export function getEditorToolbarIcon(editorId) {
  const id = typeof editorId === "string" ? editorId.trim().toLowerCase() : "";
  const raw = BY_EDITOR_ID[id] ?? ICON_GENERIC;
  return toolbarIconForDarkBar(raw);
}

export { VSCODE_TOOLBAR_ICON };
