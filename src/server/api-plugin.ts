import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import type {
  OverlayAction,
  OverlayOptions,
  OverlayState,
} from "../shared/contracts";
import type { SplitTextOptions } from "../shared/element-types";

type ApiRequest = IncomingMessage & { url?: string };
type ApiResponse = ServerResponse<IncomingMessage>;

const state: OverlayState = {
  currentOverlay: null,
  currentOptions: null,
  currentTransient: false,
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

function showOverlay(name: string, options?: OverlayOptions) {
  state.currentOverlay = name;
  state.currentOptions = options ?? null;
  state.currentTransient = false;
  broadcastAction({ type: "show", name, at: Date.now(), options });
}

function triggerTransientOverlay(
  name: string,
  options: OverlayOptions | undefined,
) {
  // Keep state visible while active, but mark as transient for clients to avoid replay on reconnect.
  state.currentOverlay = name;
  state.currentOptions = options ?? null;
  state.currentTransient = true;

  broadcastAction({ type: "show", name, at: Date.now(), options });
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

function toOverlayOptions(
  options?: SplitTextOptions,
): OverlayOptions | undefined {
  if (!options) return undefined;

  const result: OverlayOptions = {};
  if (options.text) result.text = options.text;
  if (options.colors && options.colors.length > 0)
    result.colors = options.colors;

  return Object.keys(result).length > 0 ? result : undefined;
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
            res.write(
              `event: state\ndata: ${JSON.stringify({ currentOverlay: state.currentOverlay, currentOptions: state.currentOptions, currentTransient: state.currentTransient })}\n\n`,
            );
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

          if (url === "/api/show") {
            const name = params.get("name");
            if (!name) {
              return json(
                res,
                { success: false, error: 'Missing "name" query parameter' },
                400,
              );
            }

            let overlayName = name;
            const parsedOptions = parseSplitTextOptions(params);
            const options = parsedOptions ? { ...parsedOptions } : {};

            if (overlayName === "questionTime") {
              overlayName = "splitText";
              if (!("text" in options)) {
                options.text = "Question Time";
              }
            }

            const finalOptions = toOverlayOptions(
              Object.keys(options).length > 0 ? options : undefined,
            );

            if (overlayName === "splitText") {
              triggerTransientOverlay("splitText", finalOptions);
              return json(res, {
                success: true,
                overlay: "splitText",
                transient: true,
                options: finalOptions ?? null,
              });
            }

            showOverlay(overlayName, finalOptions);
            return json(res, {
              success: true,
              overlay: overlayName,
              options: finalOptions ?? null,
            });
          }

          if (url === "/api/elements/split-text") {
            const parsedOptions = parseSplitTextOptions(params);
            const options = parsedOptions ? { ...parsedOptions } : {};

            if (!("text" in options)) {
              options.text = "SplitText";
            }

            const finalOptions = toOverlayOptions(options);

            triggerTransientOverlay("splitText", finalOptions);
            return json(res, {
              success: true,
              element: "split-text",
              overlay: "splitText",
              transient: true,
              options: finalOptions ?? null,
            });
          }

          if (url === "/api/hide") {
            const name = params.get("name");
            const normalizedName = name === "questionTime" ? "splitText" : name;

            if (normalizedName) {
              if (state.currentOverlay === normalizedName)
                state.currentOverlay = null;
            } else {
              state.currentOverlay = null;
            }
            state.currentOptions = null;
            state.currentTransient = false;
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
