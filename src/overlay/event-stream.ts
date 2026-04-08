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
    overlayAPI.show(action.name, action.options ?? {}, {
      force: true,
      layer: action.layer,
    });
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

    const entries = Object.entries(state.activeOverlays);
    const snapshotNames = new Set(entries.map(([name]) => name));

    for (const activeName of overlayAPI.getActiveOverlays()) {
      if (!snapshotNames.has(activeName)) {
        overlayAPI.hide(activeName);
      }
    }

    for (const [name, overlayState] of entries) {
      if (overlayState.transient) {
        // Never replay transient overlays from state snapshots.
        continue;
      }

      const layer =
        typeof overlayState.layer === "number" ? overlayState.layer : undefined;

      if (!overlayAPI.hasActiveOverlay(name)) {
        overlayAPI.show(name, overlayState.options ?? {}, { layer });
        continue;
      }

      if (overlayAPI.getLayer(name) !== layer) {
        overlayAPI.setLayer(name, layer);
      }
    }
  });

  stream.onerror = () => {
    console.warn("Overlay event stream disconnected; waiting for reconnect");
  };
}
