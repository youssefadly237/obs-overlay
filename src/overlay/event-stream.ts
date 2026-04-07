import { overlayAPI } from "./overlay-system";
import type { OverlayAction, OverlayState } from "../shared/contracts";

function parseEventData<T>(event: MessageEvent<string>): T | null {
  try {
    return JSON.parse(event.data) as T;
  } catch (e) {
    console.error("Invalid event payload:", e);
    return null;
  }
}

function handleAction(action: OverlayAction) {
  if (action.type === "show" && action.name) {
    overlayAPI.show(action.name, action.options ?? {}, { force: true });
    return;
  }

  if (action.type === "hide") {
    if (action.name) {
      overlayAPI.hide(action.name);
    } else {
      overlayAPI.hideAll();
    }
  }
}

export function startOverlaySync() {
  const stream = new EventSource("/api/events");

  stream.addEventListener("overlay", (event) => {
    const action = parseEventData<OverlayAction>(event as MessageEvent<string>);
    if (!action) return;
    handleAction(action);
  });

  stream.addEventListener("state", (event) => {
    const state = parseEventData<OverlayState>(event as MessageEvent<string>);
    if (!state) return;

    if (state.currentOverlay) {
      if (state.currentTransient) {
        return;
      }

      if (overlayAPI.getCurrentOverlay() !== state.currentOverlay) {
        overlayAPI.show(state.currentOverlay, state.currentOptions ?? {});
      }
      return;
    }

    overlayAPI.hideAll();
  });

  stream.onerror = () => {
    console.warn("Overlay event stream disconnected; waiting for reconnect");
  };
}
