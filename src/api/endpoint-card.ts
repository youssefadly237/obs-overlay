import type { EndpointDef } from "./endpoints";

export function createEndpointCard(ep: EndpointDef): HTMLElement {
  const card = document.createElement("div");
  card.className = "endpoint-card";

  // Header
  const header = document.createElement("div");
  header.className = "endpoint-header";
  header.innerHTML = `
    <span class="method-badge method-${ep.method.toLowerCase()}">${ep.method}</span>
    <span class="endpoint-path">${ep.path}</span>
    <span class="endpoint-desc">${ep.description}</span>
    <span class="chevron">▶</span>
  `;
  header.addEventListener("click", () => card.classList.toggle("open"));
  card.appendChild(header);

  // Body
  const body = document.createElement("div");
  body.className = "endpoint-body";

  // Params
  const inputs: Record<string, HTMLInputElement> = {};
  if (ep.params.length > 0) {
    const paramSection = document.createElement("div");
    paramSection.className = "param-section";
    paramSection.innerHTML = `<h4>Parameters</h4>`;

    for (const p of ep.params) {
      const row = document.createElement("div");
      row.className = "param-row";

      const label = document.createElement("label");
      label.textContent = p.name + (p.required ? " *" : "");
      row.appendChild(label);

      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = p.description;
      inputs[p.name] = input;
      row.appendChild(input);

      paramSection.appendChild(row);
    }

    body.appendChild(paramSection);
  }

  // Execute button
  const execBtn = document.createElement("button");
  execBtn.className = "btn-execute";
  execBtn.textContent = "Execute";
  body.appendChild(execBtn);

  // Response area
  const responseSection = document.createElement("div");
  responseSection.className = "response-section";
  responseSection.innerHTML = `<h4>Response</h4>`;

  const statusLine = document.createElement("div");
  statusLine.className = "response-status";
  responseSection.appendChild(statusLine);

  const responseBox = document.createElement("div");
  responseBox.className = "response-box";
  responseBox.textContent = "-";
  responseSection.appendChild(responseBox);

  body.appendChild(responseSection);
  card.appendChild(body);

  // Execute handler
  execBtn.addEventListener("click", async () => {
    const params = new URLSearchParams();
    for (const [key, input] of Object.entries(inputs)) {
      if (input.value.trim()) params.set(key, input.value.trim());
    }
    const query = params.toString();
    const url = ep.path + (query ? `?${query}` : "");

    statusLine.textContent = `Requesting ${url}...`;
    responseBox.textContent = "";
    responseBox.classList.remove("error");

    try {
      const resp = await fetch(url);
      const data = await resp.json();
      statusLine.textContent = `${resp.status} ${resp.statusText}`;
      responseBox.textContent = JSON.stringify(data, null, 2);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      statusLine.textContent = "Error";
      responseBox.textContent = msg;
      responseBox.classList.add("error");
    }
  });

  return card;
}
