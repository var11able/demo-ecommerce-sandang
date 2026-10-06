"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef, type ReactNode } from "react";
import { gsapEaseArrive, riseDistance } from "@/lib/motion-presets";

const heroPhoto = 0.6;
const heroStep = 0.4;
const heroStagger = 0.08;
const cardDuration = 0.35;
const cardStagger = 0.06;
const editorialDuration = 0.5;
const bannerDuration = 0.4;

export function HomeSequences({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = root.current;
    if (!container) {
      return;
    }
    gsap.registerPlugin(ScrollTrigger);
    const media = gsap.matchMedia();
    media.add("(prefers-reduced-motion: no-preference)", () => {
      const find = gsap.utils.selector(container);

      gsap
        .timeline({ defaults: { ease: gsapEaseArrive } })
        .from(find("[data-hero-photo]"), { opacity: 0, duration: heroPhoto })
        .from(
          find("[data-hero-step]"),
          { opacity: 0, y: riseDistance.card, duration: heroStep, stagger: heroStagger },
          heroPhoto / 2,
        );

      const riseOnScroll = (selector: string, duration: number, stagger: number) => {
        const targets = find(selector);
        if (targets.length === 0) {
          return;
        }
        gsap.set(targets, { opacity: 0, y: riseDistance.card });
        ScrollTrigger.batch(targets, {
          start: "top 90%",
          once: true,
          onEnter: (batch) =>
            gsap.to(batch, { opacity: 1, y: 0, duration, stagger, ease: gsapEaseArrive }),
        });
      };
      riseOnScroll("[data-arrival]", cardDuration, cardStagger);
      riseOnScroll("[data-editorial]", editorialDuration, cardStagger);

      const banner = find("[data-banner-line]")[0];
      if (banner) {
        gsap.from(banner, {
          opacity: 0,
          duration: bannerDuration,
          ease: gsapEaseArrive,
          scrollTrigger: { trigger: banner, start: "top 90%", once: true },
        });
      }
    });
    return () => media.revert();
  }, []);

  return <div ref={root}>{children}</div>;
}
