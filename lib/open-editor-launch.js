import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const launchEditor = require("launch-editor");
const { parse } = require("shell-quote");

/**
 * Same editors as `launch-editor/get-args.js` that use `-r -g path:line:col`.
 * Keys are `path.basename(editor).replace(/\.(exe|cmd|bat)$/i, '').toLowerCase()`.
 */
const VSCODE_FAMILY_BASENAME_LOWER = new Set([
  "code",
  "code - insiders",
  "code-insiders",
  "codium",
  "trae",
  "antigravity",
  "cursor",
  "vscodium",
]);

function basenameNoExt(cmd) {
  return path.basename(cmd).replace(/\.(exe|cmd|bat)$/i, "");
}

function isVsCodeFamilyCli(editorPath) {
  return VSCODE_FAMILY_BASENAME_LOWER.has(basenameNoExt(editorPath).toLowerCase());
}

function vscodeFamilyArgs(filePath, line, column) {
  return ["-r", "-g", `${filePath}:${String(line ?? 1)}:${String(column ?? 1)}`];
}

/** @param {string} p */
function firstExisting(p) {
  return p && fs.existsSync(p) ? p : null;
}

/**
 * Node (Astro dev) often inherits a minimal PATH without the editor CLI.
 * Resolve common per-user install locations on Windows.
 *
 * @param {string} editor argv0 (e.g. `cursor`, `code`)
 * @returns {{ path: string, shell: boolean } | null}
 */
function resolveWindowsVsCodeFamilyExecutable(editor) {
  if (process.platform !== "win32") return null;

  const base = basenameNoExt(editor).toLowerCase();
  const local = process.env.LOCALAPPDATA;
  const pf = process.env.ProgramFiles;

  /** @type {string[]} */
  const candidates = [];

  if (base === "cursor") {
    if (process.env.CURSOR_BIN) candidates.push(process.env.CURSOR_BIN);
    if (local) {
      candidates.push(
        path.join(local, "Programs", "cursor", "Cursor.exe"),
        path.join(local, "Programs", "cursor", "resources", "app", "bin", "cursor.cmd"),
      );
    }
    if (pf) candidates.push(path.join(pf, "Cursor", "Cursor.exe"));
  } else if (base === "code") {
    if (process.env.VSCODE_BIN) candidates.push(process.env.VSCODE_BIN);
    if (local) {
      candidates.push(path.join(local, "Programs", "Microsoft VS Code", "Code.exe"));
    }
  } else if (base === "code-insiders") {
    if (process.env.VSCODE_INSIDERS_BIN) candidates.push(process.env.VSCODE_INSIDERS_BIN);
    if (local) {
      candidates.push(
        path.join(local, "Programs", "Microsoft VS Code Insiders", "Code - Insiders.exe"),
      );
    }
  } else if (base === "codium" || base === "vscodium") {
    if (process.env.VSCODIUM_BIN) candidates.push(process.env.VSCODIUM_BIN);
    if (process.env.CODIUM_BIN) candidates.push(process.env.CODIUM_BIN);
    if (local) {
      candidates.push(path.join(local, "Programs", "VSCodium", "VSCodium.exe"));
    }
  } else {
    return null;
  }

  for (const c of candidates) {
    const hit = firstExisting(c);
    if (hit) {
      return { path: hit, shell: /\.(cmd|bat)$/i.test(hit) };
    }
  }
  return null;
}

/**
 * @param {string} editor argv0 from parsed command
 * @returns {{ executable: string, shell: boolean }}
 */
function resolveSpawnOptions(editor) {
  let executable = editor;
  let shell = false;
  if (process.platform === "win32") {
    const hasPathSep = /[\\/]/.test(editor);
    if (!hasPathSep) {
      const resolved = resolveWindowsVsCodeFamilyExecutable(editor);
      if (resolved) {
        executable = resolved.path;
        shell = resolved.shell;
      }
    } else if (/\.(cmd|bat)$/i.test(editor)) {
      shell = true;
    }
  }
  return { executable, shell };
}

/**
 * Open an editor for a file position.
 * VS Code–family CLIs often exit with code 1 on Windows (and sometimes elsewhere) after
 * successfully handing off to an existing window; `launch-editor` treats that as failure.
 * For those editors we spawn detached with stdio ignored and only surface spawn errors.
 *
 * @param {string} editorCmd resolved command (may include args if quoted)
 * @param {string} filePath absolute path
 * @param {number|string} line
 * @param {number|string} column
 * @param {(fileName: string, errMsg: string | null) => void} [onError]
 */
export function launchEditorPreferred(editorCmd, filePath, line, column, onError) {
  if (!fs.existsSync(filePath)) {
    onError?.(filePath, `File not found on disk: ${filePath}`);
    return;
  }

  const argv = parse(editorCmd);
  const editor = argv[0];
  if (!editor) {
    onError?.(filePath, "Empty editor command");
    return;
  }

  const args = [...argv.slice(1), ...vscodeFamilyArgs(filePath, line, column)];

  if (isVsCodeFamilyCli(editor)) {
    const { executable, shell } = resolveSpawnOptions(editor);
    const child = spawn(executable, args, {
      stdio: "ignore",
      detached: true,
      shell,
    });
    child.unref();
    child.on("error", (err) => {
      const code = /** @type {{ code?: string }} */ (err).code;
      const message =
        code === "ENOENT"
          ? `${err.message} (tried '${executable}'. On Windows, Node often has no Cursor/VS Code in PATH — install is auto-detected under %LOCALAPPDATA%\\Programs, or set CURSOR_BIN / VSCODE_BIN to the .exe)`
          : err.message;
      onError?.(filePath, message);
    });
    return;
  }

  const locator = `${filePath}:${line ?? 1}:${column ?? 1}`;
  launchEditor(locator, editorCmd, onError);
}
