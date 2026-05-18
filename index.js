import fs from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_EDITOR_ID,
  isKnownEditorInput,
  resolveEditor,
  KNOWN_EDITOR_IDS,
} from "./lib/editor-registry.js";
import { createOpenEditorMiddleware } from "./lib/open-editor-middleware.js";
import { getEditorToolbarIcon, toolbarIconForDarkBar } from "./lib/editor-toolbar-icons.js";

export {
  EDITORS,
  KNOWN_EDITOR_IDS,
  DEFAULT_EDITOR_ID,
  parseEditorId,
  isKnownEditorInput,
  resolveEditor,
} from "./lib/editor-registry.js";

export { getEditorToolbarIcon, toolbarIconForDarkBar, VSCODE_TOOLBAR_ICON } from "./lib/editor-toolbar-icons.js";

const OPEN_ENDPOINT = "/__open-in-editor";
const INTEGRATION_PACKAGE_NAME = "astro-vscode-inspector";
const LOG_PREFIX = `[${INTEGRATION_PACKAGE_NAME}]`;
const DEFAULT_TOOLBAR_ID = "astro:vscode:inspector";

function defaultToolbarName(editorId) {
  const { label } = resolveEditor(editorId);
  return `${label} Inspector`;
}

function isValidSvgIcon(icon) {
  return typeof icon === "string" && icon.trim().startsWith("<svg");
}

function isResolvableEntrypoint(entrypointHref) {
  try {
    const filePath = fileURLToPath(entrypointHref);
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

/**
 * Resolve the absolute project root for use by the toolbar app client.
 * Order: explicit option → PUBLIC_PROJECT_FOLDER env → Astro's config.root.
 *
 * `config.root` is a `URL` Astro derives from the user's CLI invocation; converting via
 * `fileURLToPath` yields the correct absolute path on Windows, macOS, and Linux without
 * the consumer needing to wire anything up.
 *
 * @param {{ optionValue?: string, envValue?: string, configRoot?: URL | undefined }} sources
 * @returns {string}
 */
function resolveProjectFolder({ optionValue, envValue, configRoot }) {
  if (optionValue) return stripTrailingSlash(optionValue);
  if (envValue) return stripTrailingSlash(envValue);
  if (configRoot) {
    try {
      return stripTrailingSlash(fileURLToPath(configRoot));
    } catch {
      return "";
    }
  }
  return "";
}

function stripTrailingSlash(p) {
  return p.replace(/[\\/]+$/, "");
}

// Astro's integration logger is a class — extracting `logger.error` loses `this`.
// Bind the methods (or fall back to console) so we can call them as plain functions.
function bindLog(logger) {
  return {
    info: logger?.info ? logger.info.bind(logger) : console.log,
    error: logger?.error ? logger.error.bind(logger) : console.error,
  };
}

/**
 * Astro DevToolbar integration: open inspected components in any editor supported by `launch-editor`.
 *
 * @param {object} [options]
 * @param {string} [options.name] Toolbar label
 * @param {string} [options.icon] Toolbar icon SVG
 * @param {string} [options.id] Toolbar app id
 * @param {string} [options.projectFolder] Absolute path to project root
 * @param {string} [options.editor] Editor id (see KNOWN_EDITOR_IDS) or alias e.g. `code` → vscode
 * @param {string} [options.editorCommand] Override CLI binary for `launch-editor`
 */
export default function astroVSCodeInspector(options = {}) {
  const resolved = resolveEditor(options.editor, options.editorCommand);
  const {
    name: nameOpt,
    icon: iconOpt,
    id = DEFAULT_TOOLBAR_ID,
  } = options;

  const icon =
    iconOpt != null ? toolbarIconForDarkBar(iconOpt) : getEditorToolbarIcon(resolved.id);

  if (options.editor && !isKnownEditorInput(options.editor)) {
    console.error(
      `${LOG_PREFIX} unsupported editor "${options.editor}". ` +
        `Use one of: ${KNOWN_EDITOR_IDS.join(", ")} (or an alias like "code"). Falling back to "${DEFAULT_EDITOR_ID}".`,
    );
  }

  const name = nameOpt ?? defaultToolbarName(resolved.id);
  const entrypoint = new URL("./toolbar-app.js", import.meta.url).href;

  // Resolved inside astro:config:setup so we can read config.root (cross-platform default).
  // Closure-shared with astro:server:setup.
  let projectFolder = "";

  return {
    name: INTEGRATION_PACKAGE_NAME,
    hooks: {
      "astro:config:setup": ({ addDevToolbarApp, config, logger }) => {
        const log = bindLog(logger);
        try {
          // Priority: explicit option > env var > Astro's config.root (auto, cross-platform)
          projectFolder = resolveProjectFolder({
            optionValue: options.projectFolder,
            envValue: process.env.PUBLIC_PROJECT_FOLDER,
            configRoot: config?.root,
          });

          if (!projectFolder) {
            log.error(
              `${LOG_PREFIX} could not resolve projectFolder — no option, no env var, and config.root unavailable. Inspector will not open files.`,
            );
          } else {
            log.info(`${LOG_PREFIX} projectFolder resolved: ${projectFolder}`);
          }

          if (!isValidSvgIcon(icon)) {
            log.error(
              `${LOG_PREFIX} invalid icon — expected SVG string, got ${typeof icon}. Refusing to register to avoid breaking the toolbar.`,
            );
            return;
          }
          if (!isResolvableEntrypoint(entrypoint)) {
            log.error(
              `${LOG_PREFIX} entrypoint not resolvable on disk: ${entrypoint}. Refusing to register.`,
            );
            return;
          }
          addDevToolbarApp({ id, name, icon, entrypoint });
          log.info(`${LOG_PREFIX} toolbar app registered: ${id}`);
        } catch (err) {
          log.error(
            `${LOG_PREFIX} addDevToolbarApp failed — isolated to avoid breaking other toolbar apps: ${err?.message ?? err}`,
          );
        }
      },
      "astro:server:setup": ({ server, toolbar, logger }) => {
        const log = bindLog(logger);
        try {
          toolbar.onAppInitialized(id, () => {
            try {
              toolbar.send("set-config", {
                projectFolder,
                editorId: resolved.id,
                editorLabel: resolved.label,
                endpoint: OPEN_ENDPOINT,
              });
            } catch (err) {
              log.error(
                `${LOG_PREFIX} toolbar.send(set-config) failed: ${err?.message ?? err}`,
              );
            }
          });
        } catch (err) {
          log.error(
            `${LOG_PREFIX} toolbar.onAppInitialized registration failed: ${err?.message ?? err}`,
          );
        }

        try {
          server.middlewares.use(
            OPEN_ENDPOINT,
            createOpenEditorMiddleware({
              getResolvedCommand: () => resolved.command,
              logger,
            }),
          );
        } catch (err) {
          log.error(
            `${LOG_PREFIX} middleware registration on ${OPEN_ENDPOINT} failed: ${err?.message ?? err}`,
          );
        }
      },
    },
  };
}
