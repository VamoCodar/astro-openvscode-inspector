import { defineToolbarApp } from "astro/toolbar";
import { computePosition, flip, shift, offset, arrow } from "@floating-ui/dom";

export default defineToolbarApp({
  init(canvas, app, server) {
    let isInspectorMode = false;
    let highlightedElement = null;
    let tooltip = null;

    const projectFolder = app?.config?.toolbar?.projectFolder;

    // Criar o elemento tooltip
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

      // Arrow element
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

    // Atualizar conteúdo do tooltip
    function updateTooltipContent(element) {
      if (!tooltip) return;

      const line = element.getAttribute("data-inspector-line");
      const column = element.getAttribute("data-inspector-column") || "1";
      const relativePath = element.getAttribute("data-inspector-relative-path");

      if (relativePath) {
        const pathParts = relativePath.split(/[\/\\]/);
        const fileName = pathParts[pathParts.length - 1];
        const componentName = fileName.replace(/\.(jsx|tsx|js|ts)$/, "");
        const folder = pathParts.slice(-2, -1)[0] || "";

        tooltip.innerHTML = `
          <div id="tooltip-arrow"></div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
            <span style="font-weight: 600; color: #10b981; font-size: 16px;">&lt;${componentName} /&gt;</span>
          </div>
          <div style="color: #94a3b8; font-size: 11px; margin-bottom: 6px; overflow: hidden; display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 1; width: 100%;">
           ${relativePath.replace(/\\\\/g, "/")}#L${line}
          </div>
          <div style="color: #fbbf24; font-size: 11px; font-style: italic;">
             Clique para abrir no VS Code
          </div>
        `;

        // Re-add arrow
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
    }

    // Mostrar tooltip
    async function showTooltip(element) {
      if (!tooltip) {
        tooltip = createTooltip();
      }

      updateTooltipContent(element);

      const arrowEl = tooltip.querySelector("#tooltip-arrow");

      const { x, y, placement, middlewareData } = await computePosition(
        element,
        tooltip,
        {
          placement: "top",
          middleware: [
            offset(12),
            flip(),
            shift({ padding: 8 }),
            arrow({ element: arrowEl }),
          ],
        },
      );

      // Position tooltip
      tooltip.style.left = `${x}px`;
      tooltip.style.top = `${y}px`;

      // Position arrow
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

      // Show with animation
      tooltip.style.opacity = "1";
      tooltip.style.transform = "scale(1)";
    }

    // Esconder tooltip
    function hideTooltip() {
      if (tooltip) {
        tooltip.style.opacity = "0";
        tooltip.style.transform = "scale(0.95)";
      }
    }

    // Função para encontrar elemento inspector
    function findInspectorElement(element) {
      let current = element;
      let depth = 0;
      const maxDepth = 20;

      while (current && current !== document.body && depth < maxDepth) {
        if (
          current.hasAttribute("data-inspector-line") &&
          current.hasAttribute("data-inspector-relative-path")
        ) {
          // console.log("✅ Found inspector element:", current);
          return current;
        }
        current = current.parentElement;
        depth++;
      }

      return null;
    }

    // Função para abrir no VS Code
    function openInVSCode(element) {
      const line = element.getAttribute("data-inspector-line");
      const column = element.getAttribute("data-inspector-column") || "1";
      const relativePath = element.getAttribute("data-inspector-relative-path");

      // console.log("📂 Opening file:", { line, column, relativePath });

      if (line && relativePath) {
        const normalizedPath = relativePath.replace(/\\\\/g, "/");
        const projectRoot = projectFolder;
        const absolutePath = projectRoot + normalizedPath;
        const vscodeUrl = `vscode://file/${absolutePath}:${line}:${column}`;

        // console.log("🚀 Opening VS Code URL:", vscodeUrl);

        window.location.href = vscodeUrl;

        // Desativar o modo inspector após abrir o arquivo
        // console.log("🔴 Deactivating inspector mode after opening file");

        // Força a desativação do estado interno
        isInspectorMode = false;

        // Remove eventos do document
        document.removeEventListener("click", handleDocumentClick, true);
        document.removeEventListener("mouseover", handleMouseOver, true);
        document.removeEventListener("mouseout", handleMouseOut, true);

        // Remove highlight se existir
        if (highlightedElement) {
          highlightedElement.style.outline = "";
          highlightedElement.style.backgroundColor = "";
          highlightedElement.style.cursor = "";
          highlightedElement = null;
        }

        // Remove tooltip
        hideTooltip();
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }

        // fecha funcionalidade ao clicar
        app.toggleState({ state: false });
      }
    }

    // Event handlers
    function handleDocumentClick(e) {
      // console.log(
      //   "🌍 Document click detected. Inspector mode:",
      //   isInspectorMode
      // );

      // Verificação dupla para garantir que o modo está ativo
      if (!isInspectorMode) return;

      const target = e.target;
      const inspectorElement = findInspectorElement(target);

      if (!inspectorElement) return;
      e.preventDefault();
      e.stopPropagation();
      // console.log("🎯 Opening inspector element:", inspectorElement);

      // Chama a função que vai desativar o modo automaticamente
      openInVSCode(inspectorElement);

      // Para garantir que não processamos mais cliques após a desativação
      return;
    }

    function handleMouseOver(e) {
      // Verificação dupla para garantir que o modo está ativo
      if (!isInspectorMode) return;

      const target = e.target;
      const inspectorElement = findInspectorElement(target);

      if (inspectorElement && inspectorElement !== highlightedElement) {
        // Remove highlight anterior
        if (highlightedElement) {
          highlightedElement.style.outline = "";
          highlightedElement.style.backgroundColor = "";
        }

        // Adiciona novo highlight
        highlightedElement = inspectorElement;
        highlightedElement.style.outline = "2px solid #10b981";
        highlightedElement.style.backgroundColor = "rgba(16, 185, 129, 0.1)";
        highlightedElement.style.cursor = "pointer";

        // Mostra tooltip personalizado
        showTooltip(inspectorElement);
      }
    }

    function handleMouseOut() {
      // Verificação dupla para garantir que o modo está ativo
      if (!isInspectorMode || !highlightedElement) return;

      highlightedElement.style.outline = "";
      highlightedElement.style.backgroundColor = "";
      highlightedElement.style.cursor = "";
      highlightedElement = null;

      // Esconde tooltip
      hideTooltip();
    }

    // Usa a API correta do DevToolbar para toggle
    app.onToggled((options) => {
      // console.log(
      //   `🎯 DevToolbar toggled! App is now ${
      //     options.state ? "enabled" : "disabled"
      //   }`
      // );
      isInspectorMode = options.state;

      if (isInspectorMode) {
        // console.log("🟢 Activating inspector mode");

        // Adiciona eventos ao document para capturar cliques nos elementos da página
        document.addEventListener("click", handleDocumentClick, true);
        document.addEventListener("mouseover", handleMouseOver, true);
        document.addEventListener("mouseout", handleMouseOut, true);

        // Lista elementos inspector disponíveis
        const elements = document.querySelectorAll(
          "[data-inspector-line][data-inspector-relative-path]",
        );
        // console.log(`📋 Found ${elements.length} inspector elements:`);

        // Log detalhado de cada elemento encontrado
        elements.forEach((el, i) => {
          const line = el.getAttribute("data-inspector-line");
          const column = el.getAttribute("data-inspector-column") || "1";
          const relativePath = el.getAttribute("data-inspector-relative-path");
          const fileName =
            relativePath
              ?.split(/[\/\\]/)
              .pop()
              ?.replace(/\.(jsx|tsx|js|ts)$/, "") || "unknown";

          // console.log(
          //   `  ${i + 1}. 🎯 ${fileName} - ${relativePath}:${line}:${column}`,
          //   el
          // );
        });
      } else {
        console.log("🔴 Deactivating inspector mode");

        // Remove eventos do document
        document.removeEventListener("click", handleDocumentClick, true);
        document.removeEventListener("mouseover", handleMouseOver, true);
        document.removeEventListener("mouseout", handleMouseOut, true);

        // Remove highlight se existir
        if (highlightedElement) {
          highlightedElement.style.outline = "";
          highlightedElement.style.backgroundColor = "";
          highlightedElement.style.cursor = "";
          highlightedElement = null;
        }

        // Remove tooltip
        hideTooltip();
        if (tooltip) {
          tooltip.remove();
          tooltip = null;
        }
      }
    });

    console.log("✅ Dev Inspector initialized successfully");
  },
});
