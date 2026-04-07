import "./style.css";
import { endpoints } from "./endpoints";
import { createEndpointCard } from "./endpoint-card";

const container = document.getElementById("endpoints")!;
for (const ep of endpoints) {
  container.appendChild(createEndpointCard(ep));
}
