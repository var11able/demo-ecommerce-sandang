export const durations = {
  pageChange: 0.15,
  quick: 0.2,
  lineRemoved: 0.25,
  statusChange: 0.3,
  drawer: 0.3,
  homeHero: 0.9,
  homeSection: 0.5,
  homeBanner: 0.4,
} as const;

export const easeArrive = [0, 0, 0.2, 1] as const;
export const easeLeave = [0.4, 0, 1, 1] as const;

export const gsapEaseArrive = "power2.out";

export const noMotion = { duration: 0 } as const;

export function arrive(duration: number, reduced: boolean | null) {
  return reduced ? noMotion : { duration, ease: easeArrive };
}

export function leave(duration: number, reduced: boolean | null) {
  return reduced ? noMotion : { duration, ease: easeLeave };
}

export const riseDistance = { notice: 8, card: 16 } as const;
