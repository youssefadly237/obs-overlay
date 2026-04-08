import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  OverlayAction,
  OverlayOptions,
  OverlayState,
} from "../shared/contracts";
import type {
  PlainTextOptions,
  SplitTextOptions,
} from "../shared/element-types";

type ApiRequest = IncomingMessage & { url?: string };
type ApiResponse = ServerResponse<IncomingMessage>;

const state: OverlayState = {
  activeOverlays: {},
};

const eventClients = new Set<ApiResponse>();

function json(res: ApiResponse, data: unknown, status = 200) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

function sendEvent(event: string, data: unknown) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of eventClients) {
    client.write(payload);
  }
}

function broadcastAction(action: OverlayAction) {
  sendEvent("overlay", action);
}

function parseLayerParam(params: URLSearchParams): {
  layer?: number;
  error?: string;
} {
  const rawLayer = params.get("layer");
  if (!rawLayer) {
    return {};
  }

  if (!/^-?\d+$/.test(rawLayer)) {
    return { error: 'Invalid "layer" query parameter; expected integer' };
  }

  return { layer: Number.parseInt(rawLayer, 10) };
}

function showOverlay(name: string, options?: OverlayOptions, layer?: number) {
  const entry: OverlayState["activeOverlays"][string] = {
    options: options ?? null,
    transient: false,
  };

  if (typeof layer === "number") {
    entry.layer = layer;
  }

  state.activeOverlays[name] = entry;
  broadcastAction({
    type: "show",
    name,
    at: Date.now(),
    options,
    layer,
  });
}

function triggerTransientOverlay(
  name: string,
  options: OverlayOptions | undefined,
  layer?: number,
) {
  // Keep state visible while active, but mark as transient for clients to avoid replay on reconnect.
  const entry: OverlayState["activeOverlays"][string] = {
    options: options ?? null,
    transient: true,
  };

  if (typeof layer === "number") {
    entry.layer = layer;
  }

  state.activeOverlays[name] = entry;

  broadcastAction({
    type: "show",
    name,
    at: Date.now(),
    options,
    layer,
  });
}

function parseSplitTextOptions(
  params: URLSearchParams,
): SplitTextOptions | undefined {
  const options: SplitTextOptions = {};

  const text = params.get("text");
  if (text) options.text = text;

  const colors = params.get("colors");
  if (colors) {
    const parsed = colors
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);
    if (parsed.length > 0) {
      options.colors = parsed;
    }
  }

  return options.text || (options.colors && options.colors.length > 0)
    ? options
    : undefined;
}

function parsePlainTextOptions(
  params: URLSearchParams,
): PlainTextOptions | undefined {
  const text = params.get("text");
  if (!text) return undefined;

  const trimmed = text.trim();
  if (trimmed.length === 0) return undefined;

  return { text: trimmed };
}

function toSplitTextOverlayOptions(
  options?: SplitTextOptions,
): OverlayOptions | undefined {
  if (!options) return undefined;

  const result: OverlayOptions = {};
  if (options.text) result.text = options.text;
  if (options.colors && options.colors.length > 0)
    result.colors = options.colors;

  return Object.keys(result).length > 0 ? result : undefined;
}

function toPlainTextOverlayOptions(
  options?: PlainTextOptions,
): OverlayOptions | undefined {
  if (!options?.text) return undefined;

  return { text: options.text };
}

export default function apiPlugin(): Plugin {
  return {
    name: "overlay-api",
    configureServer(server) {
      server.middlewares.use(
        (req: ApiRequest, res: ApiResponse, next: () => void) => {
          if (req.method && req.method !== "GET") {
            return next();
          }

          const raw = req.url ?? "";
          const parsedUrl = new URL(raw, "http://localhost");
          const url = parsedUrl.pathname;
          const params = parsedUrl.searchParams;

          if (url === "/api/state") {
            return json(res, state);
          }

          if (url === "/api/events") {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache, no-transform");
            res.setHeader("Connection", "keep-alive");
            res.setHeader("Access-Control-Allow-Origin", "*");
            res.flushHeaders?.();

            res.write(": connected\n\n");
            res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
            eventClients.add(res);

            const keepAlive = setInterval(() => {
              res.write(": keepalive\n\n");
            }, 20_000);

            req.on("close", () => {
              clearInterval(keepAlive);
              eventClients.delete(res);
            });

            return;
          }

          if (url === "/api/elements/plain-text") {
            const { layer, error: layerError } = parseLayerParam(params);
            if (layerError) {
              return json(res, { success: false, error: layerError }, 400);
            }

            const parsedOptions = parsePlainTextOptions(params);
            const finalOptions = toPlainTextOverlayOptions(parsedOptions);

            showOverlay("plainText", finalOptions, layer);
            return json(res, {
              success: true,
              element: "plain-text",
              overlay: "plainText",
              transient: false,
              layer: state.activeOverlays.plainText?.layer,
              options: finalOptions ?? null,
            });
          }

          if (url === "/api/elements/split-text") {
            const { layer, error: layerError } = parseLayerParam(params);
            if (layerError) {
              return json(res, { success: false, error: layerError }, 400);
            }

            const parsedOptions = parseSplitTextOptions(params);
            const options = parsedOptions ? { ...parsedOptions } : {};

            if (!("text" in options)) {
              options.text = "SplitText";
            }

            const finalOptions = toSplitTextOverlayOptions(options);

            triggerTransientOverlay("splitText", finalOptions, layer);
            return json(res, {
              success: true,
              element: "split-text",
              overlay: "splitText",
              transient: true,
              layer: state.activeOverlays.splitText?.layer,
              options: finalOptions ?? null,
            });
          }

          if (url === "/api/hide") {
            const name = params.get("name");
            const normalizedName = name === "questionTime" ? "splitText" : name;

            if (normalizedName) {
              delete state.activeOverlays[normalizedName];
            } else {
              state.activeOverlays = {};
            }
            broadcastAction({
              type: "hide",
              name: normalizedName || null,
              at: Date.now(),
            });
            return json(res, { success: true });
          }

          next();
        },
      );
    },
  };
}
