/**
 * Client-side rendering of a shareable partner poster (PNG) using Canvas 2D.
 *
 * The DEO CORE logo is drawn from its original vector path, so no image has to be
 * loaded and the canvas is never tainted. The QR code is copied from a
 * `QRCodeCanvas` element rendered by the caller.
 */

const LOGO_PATH =
  "M39.501 86.4512L54.4775 99.9326L69.4551 113.415L69.5547 113.505V191.387L69.4326 191.477L39.4785 213.647L39 214.002V86L39.501 86.4512ZM176.718 157.184L193.103 175.956H218.342L230.251 168.512L230.324 168.466H260.415L259.994 168.96L230.639 203.415L230.549 203.521H180.865L180.779 203.438L144.437 169.175L95.8164 213.628L95.7305 213.707H50.499L51.0811 213.184L113.387 157.158L113.472 157.081H176.628L176.718 157.184ZM95.8164 86.4531L144.437 130.906L180.779 96.6426L180.865 96.5605H230.549L230.639 96.666L259.994 131.121L260.415 131.615H230.324L230.251 131.569L218.342 124.125H193.103L176.718 142.897L176.628 143H113.472L113.387 142.923L51.0811 86.8975L50.499 86.374H95.7305L95.8164 86.4531Z";

/** Bounding box of the logo path inside its 300x300 viewBox. */
const LOGO_BBOX = { x: 39, y: 86, width: 221.415, height: 128.002 };

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1350;

const BRAND = "#F08331";
const BRAND_DARK = "#D96A0F";
const INK = "#0F172A";
const SLATE = "#64748B";
const SLATE_DARK = "#475569";

const FONT_STACK =
  'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif';

export type PartnerPosterOptions = {
  /** Display name of the partner. */
  partnerName: string;
  /** Referral URL encoded into the QR code. */
  url: string;
  /** Canvas produced by `QRCodeCanvas`. */
  qr: HTMLCanvasElement;
};

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawTracked(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  tracking: number,
  font: string,
  color: string,
) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  const chars = Array.from(text);
  const widths = chars.map((char) => ctx.measureText(char).width);
  const total =
    widths.reduce((sum, width) => sum + width, 0) + tracking * Math.max(chars.length - 1, 0);
  let x = centerX - total / 2;
  chars.forEach((char, index) => {
    ctx.fillText(char, x, baselineY);
    x += widths[index] + tracking;
  });
}

function drawFitted(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  baselineY: number,
  maxWidth: number,
  baseSize: number,
  weight: number,
  color: string,
  font: string,
) {
  let size = baseSize;
  ctx.font = `${weight} ${size}px ${font}`;
  const measured = ctx.measureText(text).width;
  if (measured > maxWidth) {
    size = Math.max(16, Math.floor((size * maxWidth) / measured));
  }
  ctx.font = `${weight} ${size}px ${font}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(text, centerX, baselineY);
}

function truncateToWidth(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let low = 0;
  let high = text.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return `${text.slice(0, low)}…`;
}

function drawLogo(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  top: number,
  width: number,
): number {
  const scale = width / LOGO_BBOX.width;
  ctx.save();
  ctx.translate(centerX - width / 2, top);
  ctx.scale(scale, scale);
  ctx.translate(-LOGO_BBOX.x, -LOGO_BBOX.y);
  ctx.fillStyle = BRAND;
  ctx.fill(new Path2D(LOGO_PATH));
  ctx.restore();
  return LOGO_BBOX.height * scale;
}

/** Draws the poster onto the provided canvas. */
export function drawPartnerPoster(
  canvas: HTMLCanvasElement,
  { partnerName, url, qr }: PartnerPosterOptions,
): void {
  const width = POSTER_WIDTH;
  const height = POSTER_HEIGHT;
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, width, height);

  // Background
  const background = ctx.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, "#FFFFFF");
  background.addColorStop(0.55, "#FFF6EE");
  background.addColorStop(1, "#FFE7D3");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  const glow = (x: number, y: number, radius: number, alpha: number) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(240, 131, 49, ${alpha})`);
    gradient.addColorStop(1, "rgba(240, 131, 49, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  };
  glow(1020, 30, 460, 0.18);
  glow(30, 1330, 430, 0.14);

  // Brand block
  const logoTop = 100;
  const logoHeight = drawLogo(ctx, width / 2, logoTop, 264);

  const wordmarkBaseline = logoTop + logoHeight + 80;
  drawTracked(ctx, "DEO CORE", width / 2, wordmarkBaseline, 12, `700 46px ${FONT_STACK}`, INK);
  drawFitted(
    ctx,
    "Партнёрская программа",
    width / 2,
    wordmarkBaseline + 58,
    900,
    34,
    500,
    SLATE,
    FONT_STACK,
  );
  drawTracked(ctx, "ПАРТНЁР", width / 2, wordmarkBaseline + 134, 8, `700 22px ${FONT_STACK}`, BRAND);
  drawFitted(
    ctx,
    partnerName,
    width / 2,
    wordmarkBaseline + 212,
    900,
    62,
    700,
    INK,
    FONT_STACK,
  );

  // QR panel
  const panelSize = 520;
  const panelPad = 30;
  const panelX = (width - panelSize) / 2;
  const panelY = wordmarkBaseline + 268;

  ctx.save();
  ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
  ctx.shadowBlur = 44;
  ctx.shadowOffsetY = 20;
  roundRect(ctx, panelX, panelY, panelSize, panelSize, 40);
  ctx.fillStyle = "#FFFFFF";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, panelX, panelY, panelSize, panelSize, 40);
  ctx.strokeStyle = "rgba(240, 131, 49, 0.35)";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (qr.width > 0 && qr.height > 0) {
    const qrSize = panelSize - panelPad * 2;
    ctx.drawImage(qr, panelX + panelPad, panelY + panelPad, qrSize, qrSize);
  }

  // Call to action
  const panelBottom = panelY + panelSize;
  drawFitted(
    ctx,
    "Отсканируйте камерой телефона, чтобы оставить заявку",
    width / 2,
    panelBottom + 98,
    920,
    26,
    500,
    SLATE_DARK,
    FONT_STACK,
  );

  ctx.font = `500 24px ${FONT_STACK}`;
  const link = truncateToWidth(ctx, url, 940);
  drawFitted(ctx, link, width / 2, panelBottom + 150, 940, 24, 500, BRAND_DARK, FONT_STACK);
}

/** Renders the poster to a fresh off-screen canvas. */
export function renderPartnerPoster(options: PartnerPosterOptions): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  drawPartnerPoster(canvas, options);
  return canvas;
}

/** Triggers a PNG download for the given canvas. */
export function downloadCanvasPng(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve();
        return;
      }
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      resolve();
    }, "image/png");
  });
}

/** Builds a safe download filename for a partner asset. */
export function partnerAssetFilename(code: string, kind: "poster" | "qr"): string {
  const safe =
    code
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/gi, "-")
      .replace(/^[-.]+|[-.]+$/g, "") || "partner";
  return kind === "poster" ? `deo-partner-poster-${safe}.png` : `deo-partner-qr-${safe}.png`;
}
