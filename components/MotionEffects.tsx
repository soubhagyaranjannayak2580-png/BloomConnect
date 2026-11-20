"use client";

import { useEffect, useRef, useState } from "react";

const TILT_SELECTOR = ".metric, .panel, .restaurant-card, .report-card, .hero-note, .cart-bar";
const REVEAL_SELECTOR = ".metric, .panel, .restaurant-card, .report-card, .hero-banner, .ai-banner, .cart-bar, .page-heading";

/** Global 3D tilt + cursor shine on cards, and scroll-reveal for blocks. */
export default function MotionEffects({ watch }: { watch: string }) {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (reduceMotion || !finePointer) return;

    let current: HTMLElement | null = null;
    let raf = 0;

    const reset = (element: HTMLElement) => {
      element.style.setProperty("--rx", "0deg");
      element.style.setProperty("--ry", "0deg");
      element.classList.remove("is-tilting");
    };

    const onMove = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>(TILT_SELECTOR) ?? null;
      if (current && current !== target) reset(current);
      current = target;
      if (!target) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const rect = target.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;
        // Larger blocks tilt less so they don't feel wobbly.
        const strength = Math.max(1.2, 7 - rect.width / 120);
        target.style.setProperty("--rx", `${((0.5 - y) * strength).toFixed(2)}deg`);
        target.style.setProperty("--ry", `${((x - 0.5) * strength).toFixed(2)}deg`);
        target.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        target.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        target.classList.add("is-tilting");
      });
    };
    const onLeave = () => { if (current) reset(current); current = null; };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  useEffect(() => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR));
    if (!("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -30px 0px" });
    elements.forEach((element, index) => {
      if (element.classList.contains("in-view")) return;
      element.classList.add("reveal");
      element.style.setProperty("--reveal-delay", `${Math.min(index, 8) * 55}ms`);
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [watch]);

  return null;
}

/** Animated number that counts up to `value`, preserving prefix/suffix text (e.g. "AED 8,420"). */
export function CountUp({ value, duration = 1100 }: { value: string; duration?: number }) {
  const match = value.match(/^(\D*)([\d,]+(?:\.\d+)?)(.*)$/);
  const target = match ? Number(match[2].replaceAll(",", "")) : 0;
  const decimals = match?.[2].split(".")[1]?.length ?? 0;
  const useCommas = match?.[2].includes(",") ?? false;
  const [display, setDisplay] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (!match) return;
    const length = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : duration;
    const from = fromRef.current;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min((now - start) / length, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setDisplay(from + (target - from) * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = target;
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); fromRef.current = target; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);

  if (!match) return <>{value}</>;
  const formatted = useCommas
    ? display.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : display.toFixed(decimals);
  return <span className="count-up">{match[1]}{formatted}{match[3]}</span>;
}
