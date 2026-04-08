import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export interface OverlayConfig {
  html: string;
  onShow?: (container: HTMLElement, options?: Record<string, unknown>) => void;
  onHide?: (container: HTMLElement) => void;
}

const overlays: Record<string, OverlayConfig> = {};
const activeOverlays = new Map<
  string,
  {
    container: HTMLElement;
    layer?: number;
  }
>();

export const overlayAPI = {
  register(name: string, config: OverlayConfig) {
    overlays[name] = config;
  },

  show(
    name: string,
    options: Record<string, unknown> = {},
    behavior: { force?: boolean; layer?: number } = {},
  ) {
    const config = overlays[name];
    if (!config) {
      console.warn(`Overlay "${name}" not found`);
      return;
    }

    if (activeOverlays.has(name) && !behavior.force) {
      if (typeof behavior.layer === "number") {
        this.setLayer(name, behavior.layer);
      }
      return;
    }

    if (activeOverlays.has(name)) this.hide(name);

    const root = document.getElementById("overlay-container");
    if (!root) {
      console.warn('Overlay root container "#overlay-container" not found');
      return;
    }

    const container = document.createElement("div");
    container.className = "overlay-instance";
    container.dataset.overlayName = name;

    const resolvedLayer =
      typeof behavior.layer === "number" ? behavior.layer : undefined;

    if (typeof resolvedLayer === "number") {
      container.style.zIndex = String(resolvedLayer);
    } else {
      container.style.removeProperty("z-index");
    }

    container.innerHTML = config.html;

    root.appendChild(container);
    activeOverlays.set(name, { container, layer: resolvedLayer });

    config.onShow?.(container, options);
  },

  hide(name: string) {
    const instance = activeOverlays.get(name);
    if (!instance) return;

    overlays[name]?.onHide?.(instance.container);
    instance.container.remove();
    activeOverlays.delete(name);
  },

  setLayer(name: string, layer?: number) {
    const instance = activeOverlays.get(name);
    if (!instance) return;

    instance.layer = layer;
    if (typeof layer === "number") {
      instance.container.style.zIndex = String(layer);
    } else {
      instance.container.style.removeProperty("z-index");
    }
  },

  getLayer(name: string) {
    return activeOverlays.get(name)?.layer;
  },

  hideAll() {
    const names = Array.from(activeOverlays.keys());
    for (const name of names) {
      this.hide(name);
    }
  },

  getOverlays() {
    return Object.keys(overlays);
  },

  getActiveOverlays() {
    return Array.from(activeOverlays.keys());
  },

  hasActiveOverlay(name: string) {
    return activeOverlays.has(name);
  },

  getCurrentOverlay() {
    const names = Array.from(activeOverlays.keys());
    return names.length > 0 ? names[names.length - 1] : null;
  },
};
