import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  r: number;
  vx: number; // px per ms, rightward (wind)
  vy: number; // px per ms, slight upward
  a: number; // alpha
}

const COLOR = "#5b8fd6"; // soft blue, reads on light and dark
const MAX = 70;

/**
 * Optional ambient layer: faint blue dots drifting left-to-right as if carried
 * by the wind, with a slight upward drift. They arrive in occasional gusts
 * rather than constantly. Decorative, pointer-events disabled, below modals.
 */
export function Ambient() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    let w = 0;
    let h = 0;

    // Size to the canvas's own box (it fills the editor area via CSS), not the
    // window, so particles stay inside the editor.
    function resize() {
      w = canvas!.clientWidth;
      h = canvas!.clientHeight;
      canvas!.width = Math.max(1, w * dpr);
      canvas!.height = Math.max(1, h * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const particles: Particle[] = [];

    function spawn() {
      if (particles.length >= MAX) return;
      particles.push({
        x: -10,
        y: Math.random() * h,
        r: Math.random() * 1.6 + 0.8,
        vx: Math.random() * 0.07 + 0.04, // 40–110 px/s rightward
        vy: -(Math.random() * 0.012 + 0.004), // gentle upward
        a: Math.random() * 0.35 + 0.12,
      });
    }

    let last = performance.now();
    let nextGust = 0;
    let raf = 0;

    function frame(now: number) {
      const dt = Math.min(now - last, 64);
      last = now;

      // Occasional gusts of a few particles.
      nextGust -= dt;
      if (nextGust <= 0) {
        const count = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < count; i++) spawn();
        nextGust = 500 + Math.random() * 2200;
      }

      ctx!.clearRect(0, 0, w, h);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.x > w + 12 || p.y < -12) {
          particles.splice(i, 1);
          continue;
        }
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx!.globalAlpha = p.a;
        ctx!.fillStyle = COLOR;
        ctx!.fill();
      }
      ctx!.globalAlpha = 1;
      raf = requestAnimationFrame(frame);
    }
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
    };
  }, []);

  return <canvas ref={ref} className="ambient" aria-hidden="true" />;
}
