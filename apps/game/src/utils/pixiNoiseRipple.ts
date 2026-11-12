import type { EnemyNoiseSignal } from "@webgame/types";
import { type Container, DisplacementFilter, Sprite, Texture } from "pixi.js";

const textureSize = 128;
const crestRadius = 0.72;
const displayRadiusScale = 0.77;

let rippleTexture: Texture | undefined;

type RippleWave = { radiusScale: number; strength: number };

function getRippleTexture() {
  if (rippleTexture) return rippleTexture;

  const displacementCanvas = document.createElement("canvas");
  displacementCanvas.width = textureSize;
  displacementCanvas.height = textureSize;
  const displacementContext = displacementCanvas.getContext("2d");
  if (!displacementContext) return;

  const displacement = displacementContext.createImageData(
    textureSize,
    textureSize,
  );
  for (let y = 0; y < textureSize; y++) {
    for (let x = 0; x < textureSize; x++) {
      const dx = (x + 0.5) / (textureSize / 2) - 1;
      const dy = (y + 0.5) / (textureSize / 2) - 1;
      const radius = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);
      const crest =
        crestRadius + Math.sin(angle * 3) * 0.022 + Math.cos(angle * 5) * 0.014;
      const wave = (radius - crest) / 0.14;
      const envelope = Math.exp(-wave * wave * 3);
      const offset =
        radius < 0.001 ? 0 : (Math.sin(wave * 4) * envelope) / radius;
      const index = (y * textureSize + x) * 4;

      displacement.data[index] = 128 + dx * offset * 127;
      displacement.data[index + 1] = 128 + dy * offset * 127;
      displacement.data[index + 3] = 255;
    }
  }
  displacementContext.putImageData(displacement, 0, 0);
  rippleTexture = Texture.from(displacementCanvas);
  return rippleTexture;
}

export function createNoiseRipple(world: Container, mapLayer: Container) {
  const texture = getRippleTexture();
  if (!texture) return null;

  const createWave = (area: EnemyNoiseSignal) => {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(area.x, area.y);
    world.addChild(sprite);
    // Pixi는 렌더링 시점의 월드 경계를 화면 크기로 제한한다.
    const filter = new DisplacementFilter({ sprite, clipToViewport: true });
    const displayRadius = area.radius * displayRadiusScale;
    return { sprite, filter, diameter: (displayRadius * 2) / crestRadius };
  };

  type Wave = ReturnType<typeof createWave>;
  let pairs: { primary: Wave; echo: Wave }[] = [];
  let filters: DisplacementFilter[] = [];

  const hide = () => {
    if (!mapLayer.destroyed) mapLayer.filters = null;
  };

  const updateWave = ({ sprite, filter, diameter }: Wave, wave?: RippleWave) => {
    filter.enabled = !!wave && wave.strength > 0;
    if (wave && filter.enabled) {
      sprite.setSize(diameter * wave.radiusScale);
      filter.scale.set(wave.strength * 18);
    }
  };

  const setAreas = (areas: readonly EnemyNoiseSignal[]) => {
    hide();
    for (const { primary, echo } of pairs) {
      primary.filter.destroy();
      primary.sprite.destroy();
      echo.filter.destroy();
      echo.sprite.destroy();
    }
    pairs = areas.map((area) => ({ primary: createWave(area), echo: createWave(area) }));
    filters = pairs.flatMap(({ primary, echo }) => [primary.filter, echo.filter]);
  };

  return {
    setAreas,
    show(primary: RippleWave, echo?: RippleWave) {
      if (mapLayer.destroyed || filters.length === 0) return;
      for (const pair of pairs) {
        updateWave(pair.primary, primary);
        updateWave(pair.echo, echo);
      }
      if (!mapLayer.filters) mapLayer.filters = filters;
    },
    hide,
    destroy() {
      setAreas([]);
    },
  };
}
