import { Container, Graphics } from "pixi.js";
import { useEffect } from "react";

import type { AttackEffectKind } from "@/utils/attackEffect";
import { usePixiParent } from "@/utils/pixiContext";
import { Easings, runTween, type TweenHandle } from "@/utils/pixiTween";

export type ImpactVariant = AttackEffectKind | "MUZZLE";

interface ImpactSparksProps {
  x: number;
  y: number;
  variant: ImpactVariant;
  /** 공격이 진행하는 방향(라디안). 스파크가 퍼지는 기준 방향 */
  direction: number;
  /** 이펙트 시작 지연(초) */
  delay?: number;
}

interface ParticleConfig {
  count: number;
  /** direction 기준 퍼짐 반각(라디안). Math.PI면 전방위 */
  spread: number;
  /** direction 반대(튕겨 나오는) 방향으로 쏠릴지 여부 */
  reflect: boolean;
  speed: [number, number];
  life: [number, number];
  size: [number, number];
  colors: number[];
  shape: "streak" | "chunk";
  flashRadius: number;
}

const CONFIGS: Record<ImpactVariant, ParticleConfig> = {
  SLASH: {
    count: 12,
    spread: 1.1,
    reflect: false,
    speed: [70, 160],
    life: [0.25, 0.45],
    size: [1.2, 2],
    colors: [0xffffff, 0xffe9a8, 0xffb347],
    shape: "streak",
    flashRadius: 9,
  },
  BLUNT: {
    count: 10,
    spread: Math.PI,
    reflect: false,
    speed: [30, 90],
    life: [0.35, 0.6],
    size: [2, 3.5],
    colors: [0x9a8f80, 0x7a7167, 0xb8ad9d],
    shape: "chunk",
    flashRadius: 16,
  },
  BURST: {
    count: 5,
    spread: 1.2,
    reflect: true,
    speed: [40, 100],
    life: [0.18, 0.3],
    size: [1, 1.6],
    colors: [0xffe9a8, 0xffb347],
    shape: "streak",
    flashRadius: 5,
  },
  SNIPE: {
    count: 16,
    spread: 1.4,
    reflect: true,
    speed: [90, 200],
    life: [0.3, 0.5],
    size: [1.2, 2.2],
    colors: [0xffffff, 0xffe9a8, 0xffb347],
    shape: "streak",
    flashRadius: 14,
  },
  MUZZLE: {
    count: 5,
    spread: 0.45,
    reflect: false,
    speed: [60, 130],
    life: [0.08, 0.16],
    size: [1.2, 2],
    colors: [0xffffff, 0xffd27a, 0xff9d3a],
    shape: "streak",
    flashRadius: 7,
  },
};

const rand = (min: number, max: number) => min + Math.random() * (max - min);

interface Particle {
  vx: number;
  vy: number;
  life: number;
  size: number;
  color: number;
}

const ImpactSparks = ({ x, y, variant, direction, delay = 0 }: ImpactSparksProps) => {
  const parent = usePixiParent();

  useEffect(() => {
    if (!parent || parent.destroyed) return;

    const config = CONFIGS[variant];
    const group = new Container();
    group.position.set(x, y);
    group.visible = false;
    parent.addChild(group);

    const flash = new Graphics();
    const sparks = new Graphics();
    group.addChild(flash, sparks);

    const baseAngle = config.reflect ? direction + Math.PI : direction;
    const particles: Particle[] = Array.from({ length: config.count }, () => {
      const angle = baseAngle + rand(-config.spread, config.spread);
      const speed = rand(...config.speed);
      return {
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: rand(...config.life),
        size: rand(...config.size),
        color: config.colors[Math.floor(Math.random() * config.colors.length)] ?? 0xffffff,
      };
    });
    const totalLife = Math.max(...particles.map((p) => p.life));

    let tween: TweenHandle | null = null;
    const timer = setTimeout(() => {
      if (group.destroyed) return;
      group.visible = true;
      tween = runTween({
        duration: totalLife,
        easing: Easings.Linear,
        onUpdate: (progress) => {
          if (group.destroyed) return;
          const elapsed = progress * totalLife;

          // 충격 순간의 짧은 흰색 플래시
          const flashProgress = Math.min(1, elapsed / 0.1);
          flash.clear();
          if (flashProgress < 1) {
            flash
              .circle(0, 0, config.flashRadius * (0.5 + 0.5 * flashProgress))
              .fill({ color: 0xffffff, alpha: 1 - flashProgress });
          }

          sparks.clear();
          for (const particle of particles) {
            const t = elapsed / particle.life;
            if (t >= 1) continue;
            // 감속하는 이동: 초반에 빠르게 튀고 점점 느려짐
            const travel = 1 - Math.pow(1 - t, 2);
            const px = particle.vx * particle.life * travel * 0.5;
            const py = particle.vy * particle.life * travel * 0.5;
            const alpha = 1 - t;

            if (config.shape === "streak") {
              const tail = 0.35 * (1 - t);
              sparks
                .moveTo(px, py)
                .lineTo(px - particle.vx * tail * 0.1, py - particle.vy * tail * 0.1)
                .stroke({ width: particle.size, color: particle.color, alpha, cap: "round" });
            } else {
              const size = particle.size * (1 - t * 0.5);
              sparks
                .rect(px - size / 2, py - size / 2, size, size)
                .fill({ color: particle.color, alpha });
            }
          }
        },
      });
    }, delay * 1000);

    return () => {
      clearTimeout(timer);
      tween?.destroy();
      if (!group.destroyed) {
        group.destroy({ children: true });
      }
    };
  }, [parent, x, y, variant, direction, delay]);

  return null;
};

export default ImpactSparks;
