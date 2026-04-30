/**
 * Ensures NPM_TOKEN is set before publish (granular token: write + Bypass 2FA).
 */
if (!process.env.NPM_TOKEN?.trim()) {
  console.error(`
npm publish: set NPM_TOKEN first.

  PowerShell:
    $env:NPM_TOKEN="npm_xxxxxxxx"; npm publish

  cmd.exe:
    set NPM_TOKEN=npm_xxxxxxxx&& npm publish

Create token: npmjs.com → Access Tokens → Granular → package astro-openvscode-inspector
→ Read and write → enable "Bypass 2FA" (required or registry returns 403).
`);
  process.exit(1);
}
