export interface EndpointParam {
  name: string;
  required: boolean;
  description: string;
}

export interface EndpointDef {
  method: string;
  path: string;
  description: string;
  params: EndpointParam[];
}

export const endpoints: EndpointDef[] = [
  {
    method: "GET",
    path: "/api/state",
    description: "Get active overlays state",
    params: [],
  },
  {
    method: "GET",
    path: "/api/elements/plain-text",
    description: "Show plain text element",
    params: [
      {
        name: "text",
        required: false,
        description: "Plain text content",
      },
      {
        name: "layer",
        required: false,
        description: "Optional z-layer integer (higher value renders on top)",
      },
    ],
  },
  {
    method: "GET",
    path: "/api/elements/split-text",
    description:
      "Show SplitText element now (transient; auto-hide matches animation time)",
    params: [
      { name: "text", required: false, description: "splitText text content" },
      {
        name: "layer",
        required: false,
        description: "Optional z-layer integer (higher value renders on top)",
      },
      {
        name: "colors",
        required: false,
        description:
          "Comma-separated hex colors for splitText lines (e.g. #fff,#f00,#0f0,#00f)",
      },
    ],
  },
  {
    method: "GET",
    path: "/api/hide",
    description: "Hide a specific overlay, or all if no name given",
    params: [
      { name: "name", required: false, description: "Overlay name (optional)" },
    ],
  },
];
