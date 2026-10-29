const getShapeScaleKey = (shape) => {
  switch (shape.type) {
    case 'circle':
      return 'bass';
    case 'square':
      return 'lowMid';
    case 'triangle':
      return 'mid';
    case 'cross':
      return 'treble';
    default:
      return 'default';
  }
};
function makeShapes(random = Math.random) {
  const shapeTypes = ['circle', 'square', 'triangle', 'cross'];
  let iconSlots = 0;
  return Array.from({ length: 15 }).map((_, index) => {
    const iconSlot = iconSlots < 6 && random() > 0.7 ? random() : null;
    if (iconSlot !== null) {
      iconSlots += 1;
    }
    return {
      id: index,
      type: shapeTypes[Math.floor(random() * shapeTypes.length)],
      iconSlot,
      initialX: random() * 100,
      initialY: random() * 100,
      size: 40 + random() * 100,
      duration: iconSlot !== null ? 20 + random() * 20 : 30 + random() * 30,
      delay: random() * 5,
      opacity: 0.11 + random() * 0.08,
      reverse: random() > 0.5,
      filled: random() < 0.3,
      initialRotation: random() * 360,
    };
  });
}
function makeParticles(random = Math.random) {
  return Array.from({ length: 20 }).map((_, index) => ({
    id: index,
    size: random() * 4 + 1,
    left: random() * 100,
    top: random() * 100,
    opacity: random() * 0.3,
    duration: 15 + random() * 20,
    delay: random() * 10,
  }));
}
export { getShapeScaleKey, makeParticles, makeShapes };
