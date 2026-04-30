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
const DEFAULT_TOOLBAR_ID = "astro:vscode:inspector";

function defaultToolbarName(editorId) {
  const { label } = resolveEditor(editorId);
  return `${label} Inspector`;
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
    projectFolder = process.env.PUBLIC_PROJECT_FOLDER,
  } = options;

  const icon =
    iconOpt != null ? toolbarIconForDarkBar(iconOpt) : getEditorToolbarIcon(resolved.id);

  if (options.editor && !isKnownEditorInput(options.editor)) {
    console.warn(
      `${INTEGRATION_PACKAGE_NAME}: unsupported editor "${options.editor}". ` +
        `Use one of: ${KNOWN_EDITOR_IDS.join(", ")} (or an alias like "code"). Falling back to "${DEFAULT_EDITOR_ID}".`,
    );
  }

  if (!projectFolder) {
    console.warn(
      `${INTEGRATION_PACKAGE_NAME}: projectFolder is required. Pass it or set PUBLIC_PROJECT_FOLDER.`,
    );
  }

  const name = nameOpt ?? defaultToolbarName(resolved.id);

  return {
    name: INTEGRATION_PACKAGE_NAME,
    hooks: {
      "astro:config:setup": ({ addDevToolbarApp }) => {
        addDevToolbarApp({
          id,
          name,
          icon,
          entrypoint: new URL("./toolbar-app.js", import.meta.url).href,
        });
      },
      "astro:server:setup": ({ server, toolbar, logger }) => {
        toolbar.onAppInitialized(id, () => {
          toolbar.send("set-config", {
            projectFolder,
            editorId: resolved.id,
            editorLabel: resolved.label,
            endpoint: OPEN_ENDPOINT,
          });
        });

        server.middlewares.use(
          OPEN_ENDPOINT,
          createOpenEditorMiddleware({
            getResolvedCommand: () => resolved.command,
            logger,
          }),
        );
      },
    },
  };
}
