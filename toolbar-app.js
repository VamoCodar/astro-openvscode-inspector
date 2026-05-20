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
  "min-width:360px",
  "pointer-events:none",
  "max-width:clamp(360px,42vw,90vw)",
  "max-height:min(75vh,560px)",
  "overflow:hidden",
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

const HTML_ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

const WEIGHT_NAMES = {
  100: "Thin",
  200: "ExtraLight",
  300: "Light",
  400: "Regular",
  500: "Medium",
  600: "Semibold",
  700: "Bold",
  800: "ExtraBold",
  900: "Black",
};
function weightName(w) {
  const n = parseInt(w, 10);
  if (!Number.isFinite(n)) return String(w);
  const name = WEIGHT_NAMES[n];
  return name ? `${n} ${name}` : String(n);
}

function rgbToHex(color) {
  if (!color) return "";
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (!m) return "";
  const parts = m[1].split(",").map((p) => p.trim());
  if (parts.length < 3) return "";
  const r = parseInt(parts[0], 10);
  const g = parseInt(parts[1], 10);
  const b = parseInt(parts[2], 10);
  const a = parts.length >= 4 ? parseFloat(parts[3]) : 1;
  if (a === 0) return "";
  const toHex = (v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0").toUpperCase();
  let hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a < 1) hex += toHex(Math.round(a * 255));
  return hex;
}

function colorChip(color) {
  const hex = rgbToHex(color);
  if (!hex) return "";
  return (
    `<span style="display:inline-block;width:10px;height:10px;border-radius:2px;` +
    `background:${color};border:1px solid rgba(148,163,184,.3);` +
    `vertical-align:-1px;margin-right:6px;"></span>` +
    `<span style="color:#e2e8f0;">${hex}</span>`
  );
}

function shorthand4(arr) {
  const [t, r, b, l] = arr;
  if (t === "0px" && r === "0px" && b === "0px" && l === "0px") return "";
  if (t === r && r === b && b === l) return t;
  if (t === b && r === l) return `${t} ${r}`;
  return `${t} ${r} ${b} ${l}`;
}

function truncFontFamily(s) {
  if (!s) return "";
  const list = s.split(",").map((f) => f.trim().replace(/^['"]|['"]$/g, ""));
  if (list.length === 0) return "";
  if (list.length === 1) return list[0];
  return `${list[0]} · ${list[list.length - 1]}`;
}

function formatClasses(classes) {
  if (!classes.length) return "";
  const shown = classes.slice(0, 2).map((c) => `.${c}`).join("");
  const extra = classes.length - 2;
  const tail = extra > 0
    ? ` <span style="color:#64748b;">+${extra}</span>`
    : "";
  return `<span style="color:#94a3b8;">${escapeHtml(shown)}</span>${tail}`;
}

function sectionHeader(label, color) {
  return (
    `<div style="color:${color};font-size:10px;letter-spacing:.08em;` +
    `text-transform:uppercase;margin:10px 0 4px;opacity:.85;">// ${escapeHtml(label)}</div>`
  );
}

function kvGridOpen() {
  return (
    `<div style="display:grid;grid-template-columns:54px 1fr;gap:3px 10px;` +
    `font-size:11px;align-items:start;">`
  );
}

function kvRow(key, value) {
  return (
    `<span style="color:#64748b;">${escapeHtml(key)}</span>` +
    `<span style="color:#e2e8f0;min-width:0;overflow:hidden;` +
    `text-overflow:ellipsis;white-space:nowrap;">${value}</span>`
  );
}

function headerBlock(name, path, line, info) {
  return (
    `<div style="display:flex;align-items:center;justify-content:space-between;` +
    `gap:8px;margin-bottom:6px;">` +
    `<span style="font-weight:600;color:#10b981;font-size:15px;">` +
    `&lt;${escapeHtml(name)} /&gt;</span>` +
    `<span style="background:rgba(16,185,129,.12);color:#10b981;font-size:10px;` +
    `padding:2px 6px;border-radius:4px;border:1px solid rgba(16,185,129,.25);` +
    `white-space:nowrap;">${info.width} × ${info.height}px</span>` +
    `</div>` +
    `<div style="color:#94a3b8;font-size:11px;overflow:hidden;text-overflow:ellipsis;` +
    `white-space:nowrap;">${escapeHtml(path)}#L${escapeHtml(line)}</div>`
  );
}

function typographyBlock(info) {
  const rows = [];
  rows.push(kvRow("font", escapeHtml(truncFontFamily(info.fontFamily))));

  let sizeLine = `${escapeHtml(info.fontSize)} / ${escapeHtml(info.lineHeight)}`;
  if (info.letterSpacing && info.letterSpacing !== "normal") {
    sizeLine += ` · ${escapeHtml(info.letterSpacing)}`;
  }
  rows.push(kvRow("size", sizeLine));

  let weightLine = escapeHtml(weightName(info.fontWeight));
  if (info.fontStyle === "italic") weightLine += " · italic";
  if (info.textTransform && info.textTransform !== "none") {
    weightLine += ` · ${escapeHtml(info.textTransform)}`;
  }
  rows.push(kvRow("weight", weightLine));

  const colorVal = colorChip(info.color);
  if (colorVal) rows.push(kvRow("color", colorVal));

  return sectionHeader("Typography", "#a78bfa") + kvGridOpen() + rows.join("") + `</div>`;
}

function boxBlock(info) {
  const rows = [];

  const bgVal = colorChip(info.backgroundColor);
  if (bgVal) rows.push(kvRow("bg", bgVal));

  const pad = shorthand4(info.padding);
  if (pad) rows.push(kvRow("padding", escapeHtml(pad)));

  const mar = shorthand4(info.margin);
  if (mar) rows.push(kvRow("margin", escapeHtml(mar)));

  const hasBorder =
    info.borderWidth && info.borderWidth !== "0px" && info.borderStyle && info.borderStyle !== "none";
  const hasRadius = info.borderRadius && info.borderRadius !== "0px";
  if (hasBorder) {
    const bcHex = rgbToHex(info.borderColor);
    const bcLabel = bcHex || info.borderColor;
    let line = `${escapeHtml(info.borderWidth)} ${escapeHtml(info.borderStyle)} ${escapeHtml(bcLabel)}`;
    if (hasRadius) line += ` · r ${escapeHtml(info.borderRadius)}`;
    rows.push(kvRow("border", line));
  } else if (hasRadius) {
    rows.push(kvRow("radius", escapeHtml(info.borderRadius)));
  }

  let displayLine = escapeHtml(info.display);
  if (info.position && info.position !== "static") {
    displayLine += ` · ${escapeHtml(info.position)}`;
  }
  rows.push(kvRow("display", displayLine));

  if (!rows.length) return "";
  return sectionHeader("Box", "#22d3ee") + kvGridOpen() + rows.join("") + `</div>`;
}

function domBlock(info) {
  const parts = [`<span style="color:#10b981;">${escapeHtml(info.tag)}</span>`];
  if (info.id) {
    parts.push(`<span style="color:#fbbf24;">#${escapeHtml(info.id)}</span>`);
  }
  if (info.classes.length) {
    parts.push(formatClasses(info.classes));
  }
  return (
    sectionHeader("DOM", "#fb923c") +
    `<div style="font-size:11px;overflow:hidden;text-overflow:ellipsis;` +
    `white-space:nowrap;">${parts.join("")}</div>`
  );
}

function collectElementInfo(el) {
  const cs = getComputedStyle(el);
  const rect = el.getBoundingClientRect();
  return {
    tag: el.tagName.toLowerCase(),
    id: el.id || "",
    classes: (el.getAttribute("class") || "").trim().split(/\s+/).filter(Boolean),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    fontFamily: cs.fontFamily,
    fontSize: cs.fontSize,
    fontWeight: cs.fontWeight,
    fontStyle: cs.fontStyle,
    lineHeight: cs.lineHeight,
    letterSpacing: cs.letterSpacing,
    textTransform: cs.textTransform,
    color: cs.color,
    backgroundColor: cs.backgroundColor,
    padding: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft],
    margin: [cs.marginTop, cs.marginRight, cs.marginBottom, cs.marginLeft],
    borderWidth: cs.borderTopWidth,
    borderStyle: cs.borderTopStyle,
    borderColor: cs.borderTopColor,
    borderRadius: cs.borderTopLeftRadius,
    display: cs.display,
    position: cs.position,
  };
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

    function renderTooltipContent(element, info) {
      const tip = ensureTooltip();
      const line = element.getAttribute("data-inspector-line");
      const relativePath = element.getAttribute("data-inspector-relative-path");
      if (!relativePath) return;

      const pathNorm = normalizePathFragment(relativePath);
      const fileName = pathNorm.split("/").pop() || "";
      const componentName = fileName.replace(/\.(jsx|tsx|js|ts|astro)$/, "");

      tip.innerHTML =
        `<div id="tooltip-arrow"></div>` +
        headerBlock(componentName, pathNorm, line, info) +
        typographyBlock(info) +
        boxBlock(info) +
        domBlock(info) +
        `<div style="height:1px;background:rgba(148,163,184,.18);margin:10px 0 8px;"></div>` +
        `<div style="color:#fbbf24;font-size:11px;font-style:italic;">` +
        `Click to open in ${escapeHtml(editorLabel)}</div>`;
      setArrowStyles(tip.querySelector("#tooltip-arrow"));
    }

    async function showTooltip(element, info) {
      const tip = ensureTooltip();
      renderTooltipContent(element, info);
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
      const info = collectElementInfo(target);
      highlighted = target;
      highlighted.style.outline = "2px solid #10b981";
      highlighted.style.backgroundColor = "rgba(16,185,129,.1)";
      highlighted.style.cursor = "pointer";
      showTooltip(target, info);
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
