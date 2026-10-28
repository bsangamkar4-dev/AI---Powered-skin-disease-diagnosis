export const normalizeConfidencePercent = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const confidence = Number(value);
  if (!Number.isFinite(confidence)) return null;

  const percentage = confidence > 1 ? confidence : confidence * 100;
  return Math.round(Math.min(Math.max(percentage, 0), 100));
};
