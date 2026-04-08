import { overlayAPI } from "../overlay-system";
import type { OverlayConfig } from "../overlay-system";
import { escapeHtml } from "../../shared/utils";

const plainTextOverlay: OverlayConfig = {
  html: "",
  onShow(container, options) {
    const text =
      typeof options?.text === "string" && options.text.trim().length > 0
        ? options.text.trim()
        : "Overlay pipeline works";

    container.innerHTML = `
      <div class="plain-test-wrap">
        <p class="plain-test-text">${escapeHtml(text)}</p>
      </div>
    `;
  },
};

overlayAPI.register("plainText", plainTextOverlay);
