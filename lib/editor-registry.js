/**
 * Editor registry aligned with `launch-editor` (get-args.js + editor-info).
 * @see https://github.com/yyx990803/launch-editor
 */

const isWin = process.platform === "win32";

/** @param {string} winExe @param {string} unixExe @param {string} [envKey] */
function jb(winExe, unixExe, envKey) {
  return () => (envKey && process.env[envKey]) || (isWin ? winExe : unixExe);
}

/** @param {string} command @param {string} [envKey] */
function bin(command, envKey) {
  return () => (envKey && process.env[envKey]) || command;
}

/** @typedef {{ label: string, resolveCommand: () => string }} EditorEntry */

/** @type {Record<string, EditorEntry>} */
export const EDITORS = Object.freeze({
  vscode: { label: "VS Code", resolveCommand: bin("code", "VSCODE_BIN") },
  "vscode-insiders": {
    label: "VS Code Insiders",
    resolveCommand: bin("code-insiders", "VSCODE_INSIDERS_BIN"),
  },
  vscodium: { label: "VSCodium", resolveCommand: bin("vscodium", "VSCODIUM_BIN") },
  codium: { label: "Codium", resolveCommand: bin("codium", "CODIUM_BIN") },
  cursor: { label: "Cursor", resolveCommand: bin("cursor", "CURSOR_BIN") },
  zed: { label: "Zed", resolveCommand: bin("zed", "ZED_BIN") },
  atom: { label: "Atom", resolveCommand: bin("atom", "ATOM_BIN") },
  brackets: { label: "Brackets", resolveCommand: bin("brackets", "BRACKETS_BIN") },
  sublime: { label: "Sublime Text", resolveCommand: bin("subl", "SUBLIME_BIN") },
  trae: { label: "Trae", resolveCommand: bin("trae", "TRAE_BIN") },
  antigravity: { label: "Antigravity", resolveCommand: bin("antigravity", "ANTIGRAVITY_BIN") },

  appcode: { label: "AppCode", resolveCommand: jb("appcode", "appcode", "APPCODE_BIN") },
  clion: { label: "CLion", resolveCommand: jb("clion64", "clion", "CLION_BIN") },
  idea: { label: "IntelliJ IDEA", resolveCommand: jb("idea64", "idea", "IDEA_BIN") },
  phpstorm: { label: "PhpStorm", resolveCommand: jb("phpstorm64", "phpstorm", "PHPSTORM_BIN") },
  pycharm: { label: "PyCharm", resolveCommand: jb("pycharm64", "pycharm", "PYCHARM_BIN") },
  rubymine: { label: "RubyMine", resolveCommand: jb("rubymine64", "rubymine", "RUBYMINE_BIN") },
  webstorm: { label: "WebStorm", resolveCommand: jb("webstorm64", "webstorm", "WEBSTORM_BIN") },
  goland: { label: "GoLand", resolveCommand: jb("goland64", "goland", "GOLAND_BIN") },
  rider: { label: "Rider", resolveCommand: jb("rider64", "rider", "RIDER_BIN") },

  vim: { label: "Vim", resolveCommand: bin("vim", "VIM_BIN") },
  gvim: { label: "GVim", resolveCommand: bin("gvim", "GVIM_BIN") },
  macvim: { label: "MacVim", resolveCommand: bin("mvim", "MVIM_BIN") },
  emacs: { label: "GNU Emacs", resolveCommand: bin("emacs", "EMACS_BIN") },
  emacsclient: { label: "Emacs (client)", resolveCommand: bin("emacsclient", "EMACSCLIENT_BIN") },
  nano: { label: "GNU nano", resolveCommand: bin("nano", "NANO_BIN") },
  joe: { label: "Joe", resolveCommand: bin("joe", "JOE_BIN") },

  notepadplusplus: { label: "Notepad++", resolveCommand: bin("notepad++", "NOTEPADPP_BIN") },
  textmate: { label: "TextMate", resolveCommand: bin("mate", "MATE_BIN") },
  mine: { label: "TextMate", resolveCommand: bin("mine", "MINE_BIN") },
  rmate: { label: "RMate", resolveCommand: bin("rmate", "RMATE_BIN") },
});

export const DEFAULT_EDITOR_ID = "vscode";

export const KNOWN_EDITOR_IDS = Object.freeze(Object.keys(EDITORS).sort());

const ALIASES = Object.freeze({
  code: "vscode",
  "vs-code": "vscode",
  "visual-studio-code": "vscode",
  "code-insiders": "vscode-insiders",
  sublime_text: "sublime",
  "sublime-text": "sublime",
  intellij: "idea",
  "notepad++": "notepadplusplus",
  notepadpp: "notepadplusplus",
  "idea.sh": "idea",
  "webstorm.sh": "webstorm",
  "phpstorm.sh": "phpstorm",
  "pycharm.sh": "pycharm",
  "rubymine.sh": "rubymine",
  "goland.sh": "goland",
  "clion.sh": "clion",
  "rider.sh": "rider",
});

/**
 * @param {unknown} input
 * @returns {string | null} editor id or null if unknown
 */
export function parseEditorId(input) {
  if (input == null || typeof input !== "string") return null;
  const raw = input.trim().toLowerCase();
  if (!raw) return null;
  if (raw in EDITORS) return raw;
  const mapped = ALIASES[raw];
  if (mapped && mapped in EDITORS) return mapped;
  return null;
}

export function isKnownEditorInput(input) {
  return parseEditorId(input) != null;
}

/**
 * @param {string | undefined} requested
 * @param {string | undefined} editorCommandOverride
 */
export function resolveEditor(requested, editorCommandOverride) {
  const id = parseEditorId(requested) ?? DEFAULT_EDITOR_ID;
  const entry = EDITORS[id];
  return {
    id,
    label: entry.label,
    command: editorCommandOverride || entry.resolveCommand(),
  };
}
