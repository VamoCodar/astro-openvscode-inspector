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
npm install astro-openvscode-inspector
# or
pnpm add astro-openvscode-inspector

Dependencies
This package requires:
@floating-ui/dom for tooltip positioning (automatically installed)

Usage
Add the integration to your astro.config.mjs:

```js
import { defineConfig } from 'astro/config'
import astroVSCodeInspector from 'astro-openvscode-inspector'
export default defineConfig({
  integrations: [
    astroVSCodeInspector()
  ]
})
```
Environment Variables
Make sure to set the project folder path in your .env:
`PUBLIC_PROJECT_FOLDER=/full/path/to/your/project/`

How it works
Click the VSCode icon in the Astro DevToolbar
Hover over components to see detailed tooltips with file information
Click on any component to open the corresponding file in VSCode at the exact line
Inspector mode automatically deactivates after opening a file
Requirements
Astro 4.0+ or 5.0+
VSCode installed and configured with protocol handler
Development environment only
React Dev Inspector babel plugin (for data attributes)