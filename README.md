# Astro VSCode Inspector

![alt text](https://i.imgur.com/3OJkEWg.png)
A seamless integration between Astro's DevToolbar and VSCode that allows you to open files directly from your browser during development.

## Features

- 🎯 **Click to open** - Click on any component to open it in VSCode
- 🖱️ **Smart tooltip** - Hover to see component information with beautiful floating tooltips
- 🎨 **Visual highlighting** - Clear visual feedback when hovering over components
- ⚡ **Automatic detection** - Finds inspector elements up to 20 levels deep
- 🔄 **Auto-close** - Inspector mode automatically closes after opening a file
- 🌍 **Cross-platform** - Works on Windows, macOS, and Linux

## Installation

```bash
# requirements
npm install @react-dev-inspector/babel-plugin vite 
```
```bash
npm install astro-openvscode-inspector
```

## Dependencies

This package requires: 
vite<br>
@react-dev-inspector/babel-plugin<br>

## Usage
Add the integration to your astro.config.mjs:

```js
import { defineConfig } from "astro/config";
import astroVSCodeInspector from "astro-openvscode-inspector";
import { loadEnv } from "vite";

const { PROJECT_FOLDER } = loadEnv(process.env.NODE_ENV, process.cwd(), "");

export default defineConfig({
  integrations: [
    react(
      isDev
        ? { babel: { plugins: ["@react-dev-inspector/babel-plugin"] } }
        : {},
    ),
    isDev && astroVSCodeInspector({ projectFolder: PROJECT_FOLDER }),
  ],
});
```

## Environment Variables
Make sure to set the project folder path in your .env:

**Windows:**
```env
PUBLIC_PROJECT_FOLDER=C:/Users/username/project
# or
PUBLIC_PROJECT_FOLDER=C:\\Users\\username\\project
```

**macOS/Linux:**
```env
PUBLIC_PROJECT_FOLDER=/Users/username/project
```

The library automatically detects your operating system and handles path formatting correctly.

## How it works

1. Click the VSCode icon in the Astro DevToolbar
2. Hover over components to see detailed tooltips with file information
3. Click on any component to open the corresponding file in VSCode at the exact line
4. Inspector mode automatically deactivates after opening a file

## Platform Support

✅ **Windows** - Fully supported with automatic path normalization  
✅ **macOS** - Fully supported with automatic OS detection  
✅ **Linux** - Fully supported

The library automatically detects your operating system and formats paths correctly for the `vscode://` protocol handler.

## Troubleshooting

### VS Code doesn't open when clicking

1. Make sure VS Code is installed and the `code` command is available
2. Verify that `PUBLIC_PROJECT_FOLDER` is set correctly in your `.env` file
3. Check browser console for error messages
4. Ensure the path format matches your OS (see Environment Variables section)

### Wrong file or path errors

- **Windows**: Use forward slashes (`C:/Users/...`) or escaped backslashes (`C:\\Users\\...`)
- **macOS/Linux**: Use absolute paths starting with `/` (e.g., `/Users/...` or `/home/...`)

### Inspector not working

- Make sure you have the `@react-dev-inspector/babel-plugin` installed and configured
- Check that the integration is only enabled in development mode
- Verify that your components have the inspector data attributes

