import { defineToolbarApp } from "astro/toolbar";
import { computePosition, flip, shift, offset, arrow } from "@floating-ui/dom";

const EDITOR_CONFIGS = {
  vscode: {
    label: "VS Code",
    buildUrl(absolutePath, line, column) {
      return `vscode://file/${encodeURI(absolutePath)}:${line}:${column}`;
    },
  },
  zed: {
    label: "Zed",
    buildUrl(absolutePath, line, column) {
      return `zed://file${encodeURI(absolutePath)}:${line}:${column}`;
    },
  },
};

function normalizeEditor(editor) {
  return editor === "zed" ? "zed" : "vscode";
}

export default defineToolbarApp({
  init(canvas, app, server) {
    let projectFolder = "";
    let editor = "vscode";
    let isInspectorMode = false;
    let highlightedElement = null;
    let tooltip = null;

    function detectOS() {
      const uaDataPlatform = navigator.userAgentData?.platform?.toLowerCase();
      if (uaDataPlatform?.includes("mac")) return "mac";
      if (uaDataPlatform?.includes("win")) return "windows";
      if (uaDataPlatform?.includes("linux")) return "linux";

      const platform = `${window.navigator.userAgent} ${navigator.platform || ""}`.toLowerCase();
      if (platform.includes("mac")) return "mac";
      if (platform.includes("win")) return "windows";
      if (platform.includes("linux") || platform.includes("x11")) return "linux";
      return "unknown";
    }

    server.on("set-config", ({ projectFolder: folder, editor: nextEditor }) => {
      projectFolder = folder || "";
      editor = normalizeEditor(nextEditor);
    });

    function getEditorConfig() {
      return EDITOR_CONFIGS[normalizeEditor(editor)];
    }

    function createTooltip() {
      const tooltipEl = document.createElement("div");
      tooltipEl.id = "dev-inspector-tooltip";
      tooltipEl.style.cssText = `
        position: absolute;
        z-index: 9999;
        background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
        color: #f8fafc;
        padding: 12px 16px;
        border-radius: 8px;
        font-family: 'SF Mono', 'Monaco', 'Cascadia Code', 'Roboto Mono', monospace;
        font-size: 12px;
        line-height: 1.4;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3), 0 4px 12px rgba(0, 0, 0, 0.15);
        border: 1px solid rgba(148, 163, 184, 0.2);
        min-width: 320px;
        pointer-events: none;
        max-width: clamp(320px, 40vw, 90vw);
        opacity: 0;
        transform: scale(0.95);
        transition: opacity 0.2s ease, transform 0.2s ease;
        backdrop-filter: blur(8px);
      `;

      const arrowEl = document.createElement("div");
      arrowEl.id = "tooltip-arrow";
      arrowEl.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #334155;
        transform: rotate(45deg);
        border: 1px solid rgba(148, 163, 184, 0.2);
        border-top: none;
        border-left: none;
      `;

      tooltipEl.appendChild(arrowEl);
      document.body.appendChild(tooltipEl);
      return tooltipEl;
    }

    function updateTooltipContent(element) {
      if (!tooltip) return;

      const line = element.getAttribute("data-inspector-line");
      const relativePath = element.getAttribute("data-inspector-relative-path");
      const editorConfig = getEditorConfig();

      if (!relativePath) return;

      const pathParts = relativePath.split(/[\/\\]/);
      const fileName = pathParts[pathParts.length - 1];
      const componentName = fileName.replace(/\.(jsx|tsx|js|ts|astro)$/, "");

      tooltip.innerHTML = `
        <div id="tooltip-arrow"></div>
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          <span style="font-weight: 600; color: #10b981; font-size: 16px;">&lt;${componentName} /&gt;</span>
        </div>
        <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; width: 100%;">
          ${relativePath.replace(/\\/g, "/")}#L${line}
        </div>
        <div style="color: #fbbf24; font-size: 11px; font-style: italic;">
          Click to open in ${editorConfig.label}
        </div>
      `;

      const arrowEl = tooltip.querySelector("#tooltip-arrow");
      if (arrowEl) {
        arrowEl.style.cssText = `
          position: absolute;
          width: 8px;
          height: 8px;
          background: #334155;
          transform: rotate(45deg);
          border: 1px solid rgba(148, 163, 184, 0.2);
          border-top: none;
          border-left: none;
        `;
      }
    }

    async function showTooltip(element) {
      if (!tooltip) {
        tooltip = createTooltip();
      }

      updateTooltipContent(element);
      const arrowEl = tooltip.querySelector("#tooltip-arrow");

      const { x, y, placement, middlewareData } = await computePosition(element, tooltip, {
        placement: "top",
        middleware: [offset(12), flip(), shift({ padding: 8 }), arrow({ element: arrowEl })],
      });

      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;

      if (middlewareData.arrow && arrowEl) {
        const { x: arrowX, y: arrowY } = middlewareData.arrow;
        const staticSide = {
          top: "bottom",
          right: "left",
          bottom: "top",
          left: "right",
        }[placement.split("-")[0]];

        arrowEl.style.left = arrowX != null ? `${arrowX}px` : "";
        arrowEl.style.top = arrowY != null ? `${arrowY}px` : "";
        arrowEl.style.right = "";
        arrowEl.style.bottom = "";
        arrowEl.style[staticSide] = "-4px";
      }

      tooltip.style.opacity = "1";
      tooltip.style.transform = "scale(1)";
    }

    function hideTooltip() {
      if (!tooltip) return;
      tooltip.style.opacity = "0";
      tooltip.style.transform = "scale(0.95)";
    }

    function clearHighlight() {
      if (!highlightedElement) return;
      highlightedElement.style.outline = "";
      highlightedElement.style.backgroundColor = "";
      highlightedElement.style.cursor = "";
      highlightedElement = null;
    }

    function cleanupInspector() {
      isInspectorMode = false;
      document.removeEventListener("click", handleDocumentClick, true);
      document.removeEventListener("mouseover", handleMouseOver, true);
      document.removeEventListener("mouseout", handleMouseOut, true);
      clearHighlight();
      hideTooltip();
      if (tooltip) {
        tooltip.remove();
        tooltip = null;
      }
    }

    function findInspectorElement(element) {
      let current = element;
      let depth = 0;
      const maxDepth = 20;

      while (current && current !== document.body && depth < maxDepth) {
        if (
          current.hasAttribute("data-inspector-line") &&
          current.hasAttribute("data-inspector-relative-path")
        ) {
          return current;
        }
        current = current.parentElement;
        depth += 1;
      }

      return null;
    }

    function openInEditor(element) {
      const line = element.getAttribute("data-inspector-line");
      const column = element.getAttribute("data-inspector-column") || "1";
      const relativePath = element.getAttribute("data-inspector-relative-path");

      if (line && relativePath) {
        if (!projectFolder) {
          console.warn(
            "astro-vscode-inspector: projectFolder not configured. Please set PUBLIC_PROJECT_FOLDER or pass projectFolder option.",
          );
          return;
        }

        const os = detectOS();
        const normalizedRelativePath = relativePath.replace(/\\\\/g, "/");
        const normalizedProjectFolder = projectFolder.replace(/\\/g, "/");
        const cleanProjectFolder = normalizedProjectFolder.replace(/\/$/, "");
        const cleanRelativePath = normalizedRelativePath.replace(/^\//, "");
        const absolutePath = `${cleanProjectFolder}/${cleanRelativePath}`;
        const editorUrl = getEditorConfig().buildUrl(absolutePath, line, column);

        console.log("Opening editor from inspector:", { editor, os, absolutePath, editorUrl });
        window.location.href = editorUrl;

        cleanupInspector();
        app.toggleState({ state: false });
      }
    }

    function handleDocumentClick(event) {
      if (!isInspectorMode) return;

      const inspectorElement = findInspectorElement(event.target);

      if (!inspectorElement) return;
      event.preventDefault();
      event.stopPropagation();
      openInEditor(inspectorElement);
    }

    function handleMouseOver(event) {
      if (!isInspectorMode) return;

      const inspectorElement = findInspectorElement(event.target);

      if (inspectorElement && inspectorElement !== highlightedElement) {
        clearHighlight();
        highlightedElement = inspectorElement;
        highlightedElement.style.outline = "2px solid #10b981";
        highlightedElement.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
        highlightedElement.style.cursor = "pointer";
        showTooltip(inspectorElement);
      }
    }

    function handleMouseOut() {
      if (!isInspectorMode || !highlightedElement) return;

      clearHighlight();
      hideTooltip();
    }

    app.onToggled(({ state }) => {
      isInspectorMode = state;

      if (isInspectorMode) {
        document.addEventListener("click", handleDocumentClick, true);
        document.addEventListener("mouseover", handleMouseOver, true);
        document.addEventListener("mouseout", handleMouseOut, true);
        return;
      }

      cleanupInspector();
    });

    console.log("Dev Inspector initialized successfully");
  },
});
