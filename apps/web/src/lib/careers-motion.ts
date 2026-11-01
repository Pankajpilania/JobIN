'use client';

import { useEffect, useState, type RefObject } from 'react';

export function useInView<T extends HTMLElement>(
  ref: RefObject<T | null>,
  threshold = 0.2,
): boolean {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        observer.disconnect();
      },
      { threshold, rootMargin: '0px 0px -24px 0px' },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, threshold]);

  return isVisible;
}

export function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export const motionTiming = {
  fast: 200,
  standard: 300,
  entrance: 500,
  easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
} as const;

export const motionVariants = {
  fadeUp: { className: 'fadeUp', duration: motionTiming.entrance },
  fadeIn: { className: 'fadeIn', duration: motionTiming.standard },
  staggerContainer: { className: 'staggerContainer', staggerMs: 80 },
  scaleIn: { className: 'scaleIn', duration: motionTiming.standard },
} as const;
