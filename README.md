# Astro VSCode Inspector

A seamless integration between Astro's DevToolbar and VSCode that allows you to open files directly from your browser during development.

## Features

- 🎯 **Click to open** - Click on any component to open it in VSCode
- 🖱️ **Smart tooltip** - Hover to see component information with beautiful floating tooltips
- 🎨 **Visual highlighting** - Clear visual feedback when hovering over components
- ⚡ **Automatic detection** - Finds inspector elements up to 20 levels deep
- 🔄 **Auto-close** - Inspector mode automatically closes after opening a file

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

@floating-ui/dom<br>
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
`
PUBLIC_PROJECT_FOLDER=/full/path/to/your/project/`
`


## How it works
Click the VSCode icon in the Astro DevToolbar <br>
Hover over components 
Click on any component to open the corresponding file in VSCode at the exact line

