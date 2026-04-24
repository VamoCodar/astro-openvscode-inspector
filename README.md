# Astro VSCode Inspector

![alt text](https://i.imgur.com/3OJkEWg.png)
A seamless integration between Astro's DevToolbar and your editor that allows you to open files directly from your browser during development.

## Features

- Click to open components directly in VS Code or Zed
- Smart tooltip with file information
- Visual highlighting while inspecting
- Automatic detection up to 20 levels deep
- Inspector mode auto-closes after opening a file
- Cross-platform support for Windows, macOS, and Linux

## Installation

```bash
npm install @react-dev-inspector/babel-plugin vite
npm install astro-openvscode-inspector
```

## Dependencies

This package requires:

- `vite`
- `@react-dev-inspector/babel-plugin`

## Usage

Add the integration to your `astro.config.mjs`:

```js
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import astroVSCodeInspector from "astro-openvscode-inspector";
import { loadEnv } from "vite";

const { PUBLIC_PROJECT_FOLDER } = loadEnv(process.env.NODE_ENV, process.cwd(), "");
const isDev = process.env.NODE_ENV === "development";

export default defineConfig({
  integrations: [
    react(isDev ? { babel: { plugins: ["@react-dev-inspector/babel-plugin"] } } : {}),
    isDev &&
      astroVSCodeInspector({
        projectFolder: PUBLIC_PROJECT_FOLDER,
      }),
  ],
});
```

## Open in Zed

To use Zed instead of VS Code, pass the `editor` option:

```js
astroVSCodeInspector({
  projectFolder: PUBLIC_PROJECT_FOLDER,
  editor: "zed",
});
```

The package currently supports:

- `editor: "vscode"` (default)
- `editor: "zed"`

## Environment Variables

Set the project folder path in your `.env` file.

**Windows**

```env
PUBLIC_PROJECT_FOLDER=C:/Users/username/project
# or
PUBLIC_PROJECT_FOLDER=C:\Users\username\project
```

**macOS/Linux**

```env
PUBLIC_PROJECT_FOLDER=/Users/username/project
```

## How it works

1. Click the inspector icon in the Astro DevToolbar.
2. Hover over components to preview the file and line.
3. Click any component to open it in your configured editor.
4. Inspector mode turns itself off after the click.

## Platform Support

- Windows
- macOS
- Linux

The package normalizes the project path and uses the matching editor protocol:

- VS Code: `vscode://file/...`
- Zed: `zed://file...`

## Troubleshooting

### The editor does not open

1. Make sure the editor is installed.
2. Verify that `PUBLIC_PROJECT_FOLDER` points to the real project root.
3. Check the browser console for warnings.
4. If you use Zed, confirm that the `zed://` protocol is registered on your system.

### Wrong file or wrong path

- Windows: use `C:/Users/...` or escaped backslashes
- macOS/Linux: use absolute paths starting with `/`

### Inspector does not find components

- Install `@react-dev-inspector/babel-plugin`
- Enable the integration only in development mode
- Confirm your components are emitting the inspector attributes
