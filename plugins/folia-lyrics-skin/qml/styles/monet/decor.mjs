// Derived from Folia a8da4437 (AGPL-3.0-only). See monet-reference.md.
const PARTICLE_COUNT = 10;
const buildParticles = (availableIcons) =>
  Array.from({ length: PARTICLE_COUNT }, (_, i) => i)
    .filter((i) => availableIcons.length > 0 && (i * 37 + 11) % 100 > 20)
    .map((i) => ({
      id: i,
      x: ((i * 127 + 43) % 80) + 10,
      y: ((i * 211 + 17) % 80) + 5,
      size: 46 + ((i * 53) % 40),
      rotation: (i * 97) % 360,
      duration: 20 + ((i * 71) % 20),
      delay: ((i * 41) % 80) / 10,
      opacity: 0.06 + ((i * 31) % 12) / 100,
      iconName: availableIcons[i % availableIcons.length],
      reverse: i % 2 === 0,
    }));
export { PARTICLE_COUNT, buildParticles };
