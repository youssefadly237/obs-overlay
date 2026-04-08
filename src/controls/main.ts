import "./style.css";

interface OverlayControl {
  name: string;
  showEndpoint: string;
}

const OVERLAYS: OverlayControl[] = [
  {
    name: "splitText",
    showEndpoint: "/api/elements/split-text",
  },
  {
    name: "plainText",
    showEndpoint: "/api/elements/plain-text",
  },
];

interface QuickAction {
  label: string;
  endpoint: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "Question Time",
    endpoint: "/api/elements/split-text?text=Question%20Time",
  },
];

const logsEl = document.getElementById("logs")!;
const statusEl = document.getElementById("status")!;
const buttonsEl = document.getElementById("overlay-buttons")!;
const quickActionsEl = document.getElementById("quick-actions")!;

function log(msg: string, type: "req" | "res" | "error" = "req") {
  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = "log";
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-${type}">${msg}</span>`;
  logsEl.insertBefore(entry, logsEl.firstChild);
}

async function apiCall(url: string) {
  try {
    log(`GET ${url}`, "req");
    const resp = await fetch(url);
    const data = await resp.json();
    log(`Response: ${JSON.stringify(data)}`, "res");
    statusEl.className = "status-ok";
    statusEl.textContent = `Success: ${JSON.stringify(data)}`;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log(`Error: ${msg}`, "error");
    statusEl.className = "status-error";
    statusEl.textContent = `Error: ${msg}`;
  }
}

function renderButtons() {
  for (const overlay of OVERLAYS) {
    const section = document.createElement("div");

    const showGroup = document.createElement("div");
    showGroup.className = "btn-group";

    const heading = document.createElement("h3");
    heading.textContent = overlay.name;
    section.appendChild(heading);

    const showBtn = document.createElement("button");
    showBtn.className = "btn-show";
    showBtn.textContent = `Show ${overlay.name}`;
    showBtn.addEventListener("click", () => apiCall(overlay.showEndpoint));
    showGroup.appendChild(showBtn);

    const hideBtn = document.createElement("button");
    hideBtn.className = "btn-hide";
    hideBtn.textContent = `Hide ${overlay.name}`;
    hideBtn.addEventListener("click", () =>
      apiCall(`/api/hide?name=${encodeURIComponent(overlay.name)}`),
    );
    showGroup.appendChild(hideBtn);

    section.appendChild(showGroup);
    buttonsEl.appendChild(section);
  }

  const allGroup = document.createElement("div");
  allGroup.className = "btn-group";
  const hideAllBtn = document.createElement("button");
  hideAllBtn.className = "btn-hide-all";
  hideAllBtn.textContent = "Hide All";
  hideAllBtn.addEventListener("click", () => apiCall("/api/hide"));
  allGroup.appendChild(hideAllBtn);
  buttonsEl.appendChild(allGroup);
}

function renderQuickActions() {
  for (const action of QUICK_ACTIONS) {
    const button = document.createElement("button");
    button.className = "btn-quick";
    button.textContent = action.label;
    button.addEventListener("click", () => apiCall(action.endpoint));
    quickActionsEl.appendChild(button);
  }
}

renderQuickActions();
renderButtons();
