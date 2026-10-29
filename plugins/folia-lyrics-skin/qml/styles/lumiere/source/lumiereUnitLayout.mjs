// Derived from Folia a8da4437 (AGPL-3.0-only). See docs/folia/lumiere-reference.md.
const resolveLumiereLeadShot = (shots) =>
  shots[
    Math.max(
      0,
      shots.findIndex((shot) => shot.lines.length > 0)
    )
  ];
const lumiereTypographyOfLine = (shots) => (lineIndex) => {
  let found = shots[0];
  for (const shot of shots) {
    if (shot.lines.includes(lineIndex)) return shot.profile.typography;
    if (shot.lines.length > 0 && shot.lines[0] < lineIndex) found = shot;
  }
  return found.profile.typography;
};
const resolveLumiereCameraProgress = (time, span, sections) => {
  const eased = (start, end) => {
    const linear = Math.min(1, Math.max(0, (time - start) / Math.max(end - start, 1e-3)));
    return (1 - Math.cos(linear * Math.PI)) / 2;
  };
  if (!sections || sections.length === 0) return eased(span.startTime, span.endTime);
  let index = 0;
  for (let i = 0; i < sections.length; i += 1) if (sections[i].startTime <= time) index = i;
  const section = sections[index];
  const progress = eased(section.startTime, section.endTime);
  return index % 2 === 0 ? progress : 1 - progress;
};
const createLumiereCamera = (options) => {
  const { width, height, camera } = options;
  const motion =
    options.animationIntensity === 'calm'
      ? 0.6
      : options.animationIntensity === 'chaotic'
        ? 1.4
        : 1;
  const span = { startTime: options.startTime, endTime: options.endTime };
  return (time) => {
    const progress = resolveLumiereCameraProgress(time, span, options.sections);
    const floatX =
      (Math.sin(time * 0.21 + 0.4) * 0.6 + Math.sin(time * 0.53 + 1.9) * 0.4) * 6e-3 * motion;
    const floatY =
      (Math.cos(time * 0.17 + 1.1) * 0.6 + Math.sin(time * 0.47 + 0.3) * 0.4) * 6e-3 * motion;
    return {
      x: width / 2 + (camera.driftX * progress + floatX) * width,
      y: height / 2 + (camera.driftY * progress + floatY) * height,
      pivotX: width / 2,
      pivotY: height / 2,
      scale: (1 + camera.push * progress) * (1 + 8e-3 * motion * Math.sin(time * 0.31 + 0.7)),
      rotation: 4e-3 * motion * Math.sin(time * 0.13 + 2.1),
    };
  };
};
const applyLumiereCamera = (transform, x, y) => {
  const cos = Math.cos(transform.rotation);
  const sin = Math.sin(transform.rotation);
  const dx = (x - transform.pivotX) * transform.scale;
  const dy = (y - transform.pivotY) * transform.scale;
  return { x: transform.x + dx * cos - dy * sin, y: transform.y + dx * sin + dy * cos };
};
export {
  applyLumiereCamera,
  createLumiereCamera,
  lumiereTypographyOfLine,
  resolveLumiereCameraProgress,
  resolveLumiereLeadShot,
};
