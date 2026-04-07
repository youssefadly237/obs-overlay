import { overlayAPI } from "../overlay-system";
import type { OverlayConfig } from "../overlay-system";

const plainTextTest: OverlayConfig = {
  html: `
    <div class="plain-test-wrap">
      <p class="plain-test-text">Overlay pipeline works</p>
    </div>
  `,
};

overlayAPI.register("plainTextTest", plainTextTest);
