export type OverlayOptions = Record<string, unknown>;

export interface OverlayAction {
  type: "show" | "hide";
  name: string | null;
  at: number;
  options?: OverlayOptions;
}

export interface OverlayState {
  currentOverlay: string | null;
  currentOptions: OverlayOptions | null;
  currentTransient: boolean;
}
