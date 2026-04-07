import gsap from "gsap";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(SplitText);

export interface OverlayConfig {
  html: string;
  onShow?: (container: HTMLElement, options?: Record<string, unknown>) => void;
  onHide?: (container: HTMLElement) => void;
}

const overlays: Record<string, OverlayConfig> = {};
let currentOverlay: string | null = null;

export const overlayAPI = {
  register(name: string, config: OverlayConfig) {
    overlays[name] = config;
  },

  show(
    name: string,
    options: Record<string, unknown> = {},
    behavior: { force?: boolean } = {},
  ) {
    const config = overlays[name];
    if (!config) {
      console.warn(`Overlay "${name}" not found`);
      return;
    }

    if (currentOverlay === name && !behavior.force) return;
    if (currentOverlay) this.hide(currentOverlay);

    const container = document.getElementById("overlay-container")!;
    container.innerHTML = config.html;
    currentOverlay = name;

    config.onShow?.(container, options);
  },

  hide(name: string) {
    if (currentOverlay !== name) return;

    const container = document.getElementById("overlay-container")!;
    overlays[name]?.onHide?.(container);

    container.innerHTML = "";
    currentOverlay = null;
  },

  hideAll() {
    if (currentOverlay) this.hide(currentOverlay);
  },

  getOverlays() {
    return Object.keys(overlays);
  },

  getCurrentOverlay() {
    return currentOverlay;
  },
};
