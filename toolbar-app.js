import { defineToolbarApp } from "astro/toolbar";
import { computePosition, flip, shift, offset, arrow } from "@floating-ui/dom";

const LOG_PREFIX = "[astro-vscode-inspector]";
const MAX_ANCESTOR_DEPTH = 50;
const TOOLTIP_OFFSET = 12;
const TOOLTIP_ID = "dev-inspector-tooltip";

const tooltipRootStyle = [
  "position:absolute",
  "z-index:9999",
  "background:linear-gradient(135deg,#1e293b 0%,#334155 100%)",
  "color:#f8fafc",
  "padding:12px 16px",
  "border-radius:8px",
  "font-family:'SF Mono','Monaco','Cascadia Code','Roboto Mono',monospace",
  "font-size:12px",
  "line-height:1.4",
  "box-shadow:0 10px 25px rgba(0,0,0,.3),0 4px 12px rgba(0,0,0,.15)",
  "border:1px solid rgba(148,163,184,.2)",
  "min-width:320px",
  "pointer-events:none",
  "max-width:clamp(320px,40vw,90vw)",
  "opacity:0",
  "transform:scale(.95)",
  "transition:opacity .2s ease,transform .2s ease",
  "backdrop-filter:blur(8px)",
].join(";");

const arrowStyle = [
  "position:absolute",
  "width:8px",
  "height:8px",
  "background:#334155",
  "transform:rotate(45deg)",
  "border:1px solid rgba(148,163,184,.2)",
  "border-top:none",
  "border-left:none",
].join(";");

function normalizePathFragment(pathLike) {
  return pathLike.replace(/[\\/]+/g, "/");
}

function hasInspectorAttrs(el) {
  return (
    el.hasAttribute("data-inspector-line") && el.hasAttribute("data-inspector-relative-path")
  );
}

function findInspectorElement(start) {
  let current = start;
  let depth = 0;
  while (current && current !== document.body && depth < MAX_ANCESTOR_DEPTH) {
    if (hasInspectorAttrs(current)) return current;
    current = current.parentElement;
    depth += 1;
  }
  if (depth >= MAX_ANCESTOR_DEPTH) {
    console.debug(
      `${LOG_PREFIX} reached MAX_ANCESTOR_DEPTH (${MAX_ANCESTOR_DEPTH}) without inspector attrs — increase if your tree is deeper.`,
    );
  }
  return null;
}

export default defineToolbarApp({
  init(_canvas, app, server) {
    try {
    let projectFolder = "";
    let editorLabel = "VS Code";
    let endpoint = "/__open-in-editor";
    let inspectorOn = false;
    let highlighted = null;
    let tooltipEl = null;
    let listenerController = null;

    server.on("set-config", (cfg) => {
      projectFolder = cfg.projectFolder || "";
      editorLabel =
        cfg.editorLabel ||
        (cfg.editorId ? cfg.editorId.replace(/-/g, " ") : null) ||
        cfg.editor ||
        editorLabel;
      if (cfg.endpoint) endpoint = cfg.endpoint;
    });

    function ensureTooltip() {
      if (tooltipEl && tooltipEl.isConnected) return tooltipEl;
      const existing = document.getElementById(TOOLTIP_ID);
      if (existing) {
        tooltipEl = existing;
        return existing;
      }
      const root = document.createElement("div");
      root.id = TOOLTIP_ID;
      root.style.cssText = tooltipRootStyle;
      const arrowEl = document.createElement("div");
      arrowEl.id = "tooltip-arrow";
      arrowEl.style.cssText = arrowStyle;
      root.appendChild(arrowEl);
      document.body.appendChild(root);
      tooltipEl = root;
      return root;
    }

    function setArrowStyles(arrowEl) {
      if (!arrowEl) return;
      arrowEl.style.cssText = arrowStyle;
    }

    function renderTooltipContent(element) {
      const tip = ensureTooltip();
      const line = element.getAttribute("data-inspector-line");
      const relativePath = element.getAttribute("data-inspector-relative-path");
      if (!relativePath) return;

      const pathNorm = normalizePathFragment(relativePath);
      const fileName = pathNorm.split("/").pop() || "";
      const componentName = fileName.replace(/\.(jsx|tsx|js|ts|astro)$/, "");

      tip.innerHTML = `
        <div id="tooltip-arrow"></div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;">
          <span style="font-weight:600;color:#10b981;font-size:16px;">&lt;${componentName} /&gt;</span>
        </div>
        <div style="color:#94a3b8;font-size:11px;margin-bottom:6px;overflow:hidden;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:1;width:100%;">
          ${pathNorm}#L${line}
        </div>
        <div style="color:#fbbf24;font-size:11px;font-style:italic;">
          Click to open in ${editorLabel}
        </div>`;
      setArrowStyles(tip.querySelector("#tooltip-arrow"));
    }

    async function showTooltip(element) {
      const tip = ensureTooltip();
      renderTooltipContent(element);
      const arrowEl = tip.querySelector("#tooltip-arrow");
      const { x, y, placement, middlewareData } = await computePosition(element, tip, {
        placement: "top",
        middleware: [offset(TOOLTIP_OFFSET), flip(), shift({ padding: 8 }), arrow({ element: arrowEl })],
      });

      tip.style.left = `${x}px`;
      tip.style.top = `${y}px`;

      if (middlewareData.arrow && arrowEl) {
        const { x: ax, y: ay } = middlewareData.arrow;
        const staticSide = { top: "bottom", right: "left", bottom: "top", left: "right" }[
          placement.split("-")[0]
        ];
        arrowEl.style.left = ax != null ? `${ax}px` : "";
        arrowEl.style.top = ay != null ? `${ay}px` : "";
        arrowEl.style.right = "";
        arrowEl.style.bottom = "";
        arrowEl.style[staticSide] = "-4px";
      }

      tip.style.opacity = "1";
      tip.style.transform = "scale(1)";
    }

    function hideTooltip() {
      if (!tooltipEl) return;
      tooltipEl.style.opacity = "0";
      tooltipEl.style.transform = "scale(.95)";
    }

    function clearHighlight() {
      if (!highlighted) return;
      highlighted.style.outline = "";
      highlighted.style.backgroundColor = "";
      highlighted.style.cursor = "";
      highlighted = null;
    }

    function teardownInspector() {
      inspectorOn = false;
      if (listenerController) {
        listenerController.abort();
        listenerController = null;
      }
      clearHighlight();
      hideTooltip();
      if (tooltipEl) {
        tooltipEl.remove();
        tooltipEl = null;
      }
    }

    function closeInspector() {
      teardownInspector();
      try {
        app.toggleState({ state: false });
      } catch (err) {
        console.error(`${LOG_PREFIX} app.toggleState failed`, err);
      }
    }

    async function openInEditor(element) {
      try {
        const line = element.getAttribute("data-inspector-line");
        const column = element.getAttribute("data-inspector-column") || "1";
        const relativePath = element.getAttribute("data-inspector-relative-path");
        if (!line || !relativePath) {
          console.error(
            `${LOG_PREFIX} missing data-inspector-line or data-inspector-relative-path on clicked element`,
          );
          return;
        }

        if (!projectFolder) {
          console.error(
            `${LOG_PREFIX} projectFolder not configured. Pass it as integration option or set PUBLIC_PROJECT_FOLDER env var.`,
          );
          return;
        }

        const rel = normalizePathFragment(relativePath).replace(/^\/+/, "");
        const root = normalizePathFragment(projectFolder).replace(/\/+$/, "");
        const absolutePath = `${root}/${rel}`;

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ file: absolutePath, line, column }),
          });
          if (!res.ok) {
            const text = await res.text().catch(() => "");
            console.error(`${LOG_PREFIX} server ${res.status}: ${text}`);
          }
        } catch (err) {
          console.error(`${LOG_PREFIX} open-in-editor request failed`, err);
        }
      } finally {
        closeInspector();
      }
    }

    function onDocClick(ev) {
      if (!inspectorOn) return;
      const target = findInspectorElement(ev.target);
      if (!target) return;
      ev.preventDefault();
      ev.stopPropagation();
      openInEditor(target);
    }

    function onMouseOver(ev) {
      if (!inspectorOn) return;
      const target = findInspectorElement(ev.target);
      if (!target || target === highlighted) return;
      clearHighlight();
      highlighted = target;
      highlighted.style.outline = "2px solid #10b981";
      highlighted.style.backgroundColor = "rgba(16,185,129,.1)";
      highlighted.style.cursor = "pointer";
      showTooltip(target);
    }

    function onMouseOut() {
      if (!inspectorOn || !highlighted) return;
      clearHighlight();
      hideTooltip();
    }

    app.onToggled(({ state }) => {
      inspectorOn = state;
      if (inspectorOn) {
        if (listenerController) listenerController.abort();
        listenerController = new AbortController();
        const { signal } = listenerController;
        document.addEventListener("click", onDocClick, { capture: true, signal });
        document.addEventListener("mouseover", onMouseOver, { capture: true, signal });
        document.addEventListener("mouseout", onMouseOut, { capture: true, signal });
        return;
      }
      teardownInspector();
    });

    console.log(`${LOG_PREFIX} dev inspector initialized`);
    } catch (err) {
      console.error(
        `${LOG_PREFIX} init failed — toolbar app will appear but be non-functional. Cause:`,
        err,
      );
    }
  },
});
