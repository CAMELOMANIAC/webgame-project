import type { EnemyNoiseSignal } from "@webgame/types";
import { type Container, DisplacementFilter, Graphics, Sprite, Texture } from "pixi.js";

const textureSize = 128;
const crestRadius = 0.72;
const displayRadiusScale = 0.77;
const ringColor = 0xe4e4e7;
const primaryRingAlpha = 0.2;
const echoRingAlpha = 0.13;

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

  const createWave = (area: EnemyNoiseSignal, isEcho: boolean) => {
    const sprite = new Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.position.set(area.x, area.y);
    world.addChild(sprite);
    // Pixi는 렌더링 시점의 월드 경계를 화면 크기로 제한한다.
    const filter = new DisplacementFilter({ sprite, clipToViewport: true });
    const displayRadius = area.radius * displayRadiusScale;

    const ring = new Graphics();
    ring.position.set(area.x, area.y);
    ring.visible = false;
    world.addChild(ring);

    return {
      sprite,
      filter,
      ring,
      baseX: area.x,
      baseY: area.y,
      displayRadius,
      diameter: (displayRadius * 2) / crestRadius,
      maxRingAlpha: isEcho ? echoRingAlpha : primaryRingAlpha,
      ringWidth: isEcho ? 1.25 : 1.75,
    };
  };

  type Wave = ReturnType<typeof createWave>;
  let pairs: { primary: Wave; echo: Wave }[] = [];
  let filters: DisplacementFilter[] = [];

  const hide = () => {
    if (!mapLayer.destroyed) mapLayer.filters = null;
    for (const { primary, echo } of pairs) {
      if (!primary.ring.destroyed) primary.ring.visible = false;
      if (!echo.ring.destroyed) echo.ring.visible = false;
    }
  };

  const updateWave = (
    { sprite, filter, ring, displayRadius, diameter, maxRingAlpha, ringWidth }: Wave,
    wave?: RippleWave,
  ) => {
    const active = !!wave && wave.strength > 0;
    filter.enabled = active;
    if (wave && active) {
      sprite.setSize(diameter * wave.radiusScale);
      filter.scale.set(wave.strength * 18);
      if (!ring.destroyed) {
        ring.visible = true;
        ring
          .clear()
          .circle(0, 0, displayRadius * wave.radiusScale)
          .stroke({
            width: ringWidth,
            color: ringColor,
            alpha: maxRingAlpha * wave.strength,
          });
      }
    } else if (!ring.destroyed) {
      ring.visible = false;
    }
  };

  const setAreas = (areas: readonly EnemyNoiseSignal[]) => {
    hide();
    for (const { primary, echo } of pairs) {
      primary.filter.destroy();
      primary.sprite.destroy();
      primary.ring.destroy();
      echo.filter.destroy();
      echo.sprite.destroy();
      echo.ring.destroy();
    }
    pairs = areas.map((area) => ({
      primary: createWave(area, false),
      echo: createWave(area, true),
    }));
    filters = pairs.flatMap(({ primary, echo }) => [primary.filter, echo.filter]);
  };

  const updatePair = (
    index: number,
    primary?: RippleWave,
    echo?: RippleWave,
  ) => {
    const pair = pairs[index];
    if (!pair || mapLayer.destroyed) return;
    updateWave(pair.primary, primary);
    updateWave(pair.echo, echo);
    if (primary || echo) {
      if (!mapLayer.filters) mapLayer.filters = filters;
    } else if (
      pairs.every(
        ({ primary: p, echo: e }) => !p.filter.enabled && !e.filter.enabled,
      )
    ) {
      mapLayer.filters = null;
    }
  };

  return {
    setAreas,
    randomizeOffset(index: number, maxOffset = 8) {
      const pair = pairs[index];
      if (!pair) return;
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * maxOffset;
      const x = pair.primary.baseX + Math.cos(angle) * dist;
      const y = pair.primary.baseY + Math.sin(angle) * dist;
      if (!pair.primary.sprite.destroyed) pair.primary.sprite.position.set(x, y);
      if (!pair.primary.ring.destroyed) pair.primary.ring.position.set(x, y);
      if (!pair.echo.sprite.destroyed) pair.echo.sprite.position.set(x, y);
      if (!pair.echo.ring.destroyed) pair.echo.ring.position.set(x, y);
    },
    updatePair,
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
