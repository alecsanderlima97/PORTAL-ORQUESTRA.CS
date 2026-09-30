export const motionLabConfig = {
  parallax: true,
  mouseParallax: true,
  particles: true,
  characterFloating: true,
  scrollStorytelling: true,
  mouseTravel: 12,
  parallaxTravel: 56,
  floatingDistance: 8,
  scrollDistance: 3.6,
} as const;

export type MotionLabConfig = typeof motionLabConfig;
