import { Texture } from "pixi.js";

let compassTexturePromise: Promise<Texture> | null = null;
let fogOfWarTexture: Texture | null = null;
const dotTextureCache = new Map<string, Texture>();

/**
 * SVG 내부의 <filter>(drop-shadow 등)를 브라우저 네이티브 래스터라이저로 보존하기 위해
 * HTMLImageElement -> Offscreen Canvas -> Pixi Texture 파이프라인으로 로드 및 캐싱합니다.
 */
export function loadCompassTexture(compassUrl: string): Promise<Texture> {
  if (compassTexturePromise) {
    return compassTexturePromise;
  }

  compassTexturePromise = new Promise<Texture>((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const size = 146; // 73x73 원본의 2배 해상도로 선명하게 래스터화
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0, size, size);
      }
      const texture = Texture.from(canvas);
      resolve(texture);
    };
    img.onerror = (err) => {
      compassTexturePromise = null;
      reject(err);
    };
    img.src = compassUrl;
  });

  return compassTexturePromise;
}

/**
 * 플레이어 시야 안개(Fog of War) 방사형 그라데이션을 오프스크린 캔버스에 1회 구워
 * GPU 텍스처로 반환합니다. (월드 상 반지름 2000px 대응)
 */
export function getFogOfWarTexture(): Texture {
  if (fogOfWarTexture) {
    return fogOfWarTexture;
  }

  // 월드 반지름 2000px (지름 4000px)을 1024x1024 텍스처로 베이킹 (비율 1024 / 4000 = 0.256)
  const texSize = 1024;
  const half = texSize / 2;
  const worldRadius = 2000;
  const gradEndWorldRadius = 150;
  const scale = half / worldRadius;
  const gradEndTexRadius = gradEndWorldRadius * scale;

  const canvas = document.createElement("canvas");
  canvas.width = texSize;
  canvas.height = texSize;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    const grad = ctx.createRadialGradient(half, half, 0, half, half, gradEndTexRadius);
    grad.addColorStop(0, "rgba(6, 7, 10, 0)");
    grad.addColorStop(0.15, "rgba(6, 7, 10, 0)");
    grad.addColorStop(0.3, "rgba(6, 7, 10, 0.2)");
    grad.addColorStop(0.5, "rgba(6, 7, 10, 0.5)");
    grad.addColorStop(1, "rgba(6, 7, 10, 0.5)");

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(half, half, half, 0, Math.PI * 2);
    ctx.fill();
  }

  fogOfWarTexture = Texture.from(canvas);
  return fogOfWarTexture;
}

export interface GlowingDotOptions {
  radius: number;
  fill: string;
  shadowColor: string;
  shadowBlur: number;
  shadowAlpha?: number;
}

/**
 * 발광 구체(적 유닛 마커, 레이더 탄환 등)를 고해상도 오프스크린 캔버스에 1회 구워
 * 캐싱된 Pixi Texture로 반환합니다.
 */
export function getGlowingDotTexture(options: GlowingDotOptions): {
  texture: Texture;
  logicalSize: number;
} {
  const { radius, fill, shadowColor, shadowBlur, shadowAlpha = 1 } = options;
  const key = `${radius}-${fill}-${shadowColor}-${shadowBlur}-${shadowAlpha}`;

  const padding = Math.ceil(shadowBlur * 2 + 4);
  const logicalSize = (radius + padding) * 2;
  const existing = dotTextureCache.get(key);
  if (existing) {
    return { texture: existing, logicalSize };
  }

  const dpr = 2;
  const canvas = document.createElement("canvas");
  canvas.width = logicalSize * dpr;
  canvas.height = logicalSize * dpr;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.scale(dpr, dpr);
    const center = logicalSize / 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.shadowColor = shadowColor;
    ctx.shadowBlur = shadowBlur * dpr;
    ctx.globalAlpha = shadowAlpha;
    ctx.fill();
    ctx.restore();

    // 코어 원형을 한 번 더 선명하게 덧그림
    ctx.beginPath();
    ctx.arc(center, center, radius, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
  }

  const texture = Texture.from(canvas);
  dotTextureCache.set(key, texture);
  return { texture, logicalSize };
}
