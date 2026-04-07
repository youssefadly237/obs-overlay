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
    description: "Get current overlay state",
    params: [],
  },
  {
    method: "GET",
    path: "/api/elements/split-text",
    description:
      "Show SplitText element now (transient; auto-hide matches animation time)",
    params: [
      { name: "text", required: false, description: "splitText text content" },
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
    path: "/api/show",
    description: "Show an overlay by name",
    params: [
      {
        name: "name",
        required: true,
        description: "Overlay name (e.g. splitText or plainTextTest)",
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
