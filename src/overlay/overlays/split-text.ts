import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import { overlayAPI } from "../overlay-system";
import type { OverlayConfig } from "../overlay-system";
import type { SplitTextOptions } from "../../shared/element-types";

gsap.registerPlugin(SplitText);

const DEFAULT_TEXT = "SplitText";
const DEFAULT_COLORS = ["#000000", "#000000", "#000000", "#000000"];

const SPLIT_TEXT_LINE_COUNT = 4;
const SPLIT_TEXT_CHAR_ROTATION_DURATION_S = 0.9;
const SPLIT_TEXT_LINE_START_STAGGER_S = 0.45;

let timeline: gsap.core.Timeline | null = null;
let splitInstances: SplitText[] = [];

function notifySplitTextHidden() {
  void fetch("/api/hide?name=splitText").catch((error) => {
    console.warn("Failed to sync splitText hide with server:", error);
  });
}

function fitLinesToTargetWidth(
  lines: NodeListOf<HTMLElement>,
  targetWidthPx: number,
) {
  const referenceFontSizePx = window.innerWidth * 0.18;

  for (const line of lines) {
    line.style.fontSize = `${referenceFontSizePx}px`;
  }

  const widestLinePx = Math.max(
    ...Array.from(lines).map((line) => line.getBoundingClientRect().width),
  );
  if (!Number.isFinite(widestLinePx) || widestLinePx <= 0) return;

  const fittedFontSizePx = Math.max(
    24,
    referenceFontSizePx * (targetWidthPx / widestLinePx),
  );
  for (const line of lines) {
    line.style.fontSize = `${fittedFontSizePx}px`;
  }
}

function isHexColor(input: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(input);
}

function normalizeOptions(
  options?: Record<string, unknown>,
): Required<SplitTextOptions> {
  const text =
    typeof options?.text === "string" && options.text.trim().length > 0
      ? options.text.trim()
      : DEFAULT_TEXT;

  const sourceColors = Array.isArray(options?.colors) ? options.colors : [];
  const colors = sourceColors
    .filter((color): color is string => typeof color === "string")
    .map((color) => color.trim())
    .filter((color) => isHexColor(color));

  return {
    text,
    colors: colors.length > 0 ? colors : DEFAULT_COLORS,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildMarkup(options: Required<SplitTextOptions>): string {
  const safeText = escapeHtml(options.text);
  const lines = Array.from({ length: SPLIT_TEXT_LINE_COUNT }, (_, index) => {
    const color = options.colors[index % options.colors.length];
    return `<h1 class="split-text-line line line${index + 1}" style="color: ${color}">${safeText}</h1>`;
  }).join("");

  return `
    <div class="split-text-container">
      <div class="split-text-tube">
        ${lines}
      </div>
    </div>
  `;
}

const splitTextOverlay: OverlayConfig = {
  html: "",
  onShow(container, incomingOptions) {
    timeline?.kill();
    timeline = null;

    for (const split of splitInstances) {
      split.revert();
    }
    splitInstances = [];

    const options = normalizeOptions(incomingOptions);
    container.innerHTML = buildMarkup(options);

    const textContainer = container.querySelector<HTMLElement>(
      ".split-text-container",
    );
    const lines = container.querySelectorAll<HTMLElement>(".split-text-line");

    if (!textContainer || lines.length === 0) {
      console.error("splitText overlay markup missing expected elements");
      return;
    }

    fitLinesToTargetWidth(lines, window.innerWidth * 0.6);

    gsap.set(textContainer, { visibility: "visible" });

    const width = window.innerWidth;
    const depth = -width / 8;
    const transformOrigin = `50% 50% ${depth}`;

    gsap.set(lines, { perspective: 700, transformStyle: "preserve-3d" });

    try {
      splitInstances = Array.from(lines).map(
        (line) =>
          new SplitText(line, { type: "chars", charsClass: "split-char" }),
      );

      timeline = gsap.timeline({
        repeat: 0,
        onComplete: () => {
          overlayAPI.hide("splitText");
          notifySplitTextHidden();
        },
      });

      splitInstances.forEach((split, index) => {
        timeline!.fromTo(
          split.chars,
          { rotationX: -90 },
          {
            rotationX: 90,
            stagger: 0.08,
            duration: SPLIT_TEXT_CHAR_ROTATION_DURATION_S,
            ease: "none",
            transformOrigin,
          },
          index * SPLIT_TEXT_LINE_START_STAGGER_S,
        );
      });
    } catch (error) {
      console.error("splitText setup failed, using static fallback:", error);
      gsap.set(lines, { rotationX: 0, opacity: 1 });

      timeline = gsap.timeline({
        onComplete: () => {
          overlayAPI.hide("splitText");
          notifySplitTextHidden();
        },
      });

      timeline.fromTo(
        lines,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.12, ease: "power2.out" },
      );
      timeline.to({}, { duration: 1.4 });
    }
  },

  onHide() {
    timeline?.kill();
    timeline = null;

    for (const split of splitInstances) {
      split.revert();
    }
    splitInstances = [];
  },
};

overlayAPI.register("splitText", splitTextOverlay);
