import { launchEditorPreferred } from "./open-editor-launch.js";

const MAX_BODY = 1e6;

/**
 * @param {object} opts
 * @param {() => string} opts.getResolvedCommand
 * @param {{ info?: Function, error?: Function } | undefined} opts.logger
 */
export function createOpenEditorMiddleware({ getResolvedCommand, logger }) {
  return (req, res) => {
    if (req.method !== "POST") {
      res.statusCode = 405;
      res.setHeader("Allow", "POST");
      res.end("Method Not Allowed");
      return;
    }

    let body = "";
    let aborted = false;
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > MAX_BODY) {
        aborted = true;
        res.statusCode = 413;
        res.end("Payload Too Large");
        req.destroy();
      }
    });

    req.on("error", (err) => {
      if (aborted) return;
      logger?.error?.(`[astro-vscode-inspector] middleware request error: ${err?.message ?? err}`);
      if (!res.headersSent) {
        res.statusCode = 400;
        res.end("Request error");
      }
    });

    req.on("end", () => {
      if (aborted) return;
      let payload;
      try {
        payload = JSON.parse(body || "{}");
      } catch {
        res.statusCode = 400;
        res.end("Invalid JSON");
        return;
      }

      const { file, line = 1, column = 1 } = payload;
      if (!file || typeof file !== "string") {
        res.statusCode = 400;
        res.end("Missing file");
        return;
      }

      const resolvedCommand = getResolvedCommand();
      const locator = `${file}:${line}:${column}`;
      logger?.info?.(`[inspector] opening ${locator} in ${resolvedCommand}`);

      launchEditorPreferred(
        resolvedCommand,
        file,
        line,
        column,
        (fileName, errMsg) => {
          logger?.error?.(`[inspector] launch-editor failed for ${fileName}: ${errMsg}`);
        },
      );

      res.statusCode = 200;
      res.setHeader("content-type", "application/json");
      res.end(JSON.stringify({ ok: true }));
    });
  };
}
