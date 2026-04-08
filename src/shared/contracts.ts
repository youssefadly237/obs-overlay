export type OverlayOptions = Record<string, unknown>;

export interface OverlayAction {
  type: "show" | "hide";
  name: string | null;
  at: number;
  options?: OverlayOptions;
  layer?: number;
}

export interface OverlayStateEntry {
  options: OverlayOptions | null;
  transient: boolean;
  layer?: number;
}

export interface OverlayState {
  activeOverlays: Record<string, OverlayStateEntry>;
}
