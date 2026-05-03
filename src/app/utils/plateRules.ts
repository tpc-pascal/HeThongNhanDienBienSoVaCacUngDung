export const normalizePlate = (value: unknown) =>
  String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/[\s.-]/g, '');

const PLATE_RULES = [
  /^\d{2}[A-Z]\d{4,5}$/,
  /^\d{2}[A-Z]{2}\d{4,5}$/,
  /^\d{3}[A-Z]\d{4,5}$/,
  /^\d{2}[A-Z]\d[A-Z]?\d{4,5}$/,
];

export const isValidPlate = (value: unknown) => {
  const plate = normalizePlate(value);
  return plate.length >= 7 && plate.length <= 9 && PLATE_RULES.some((rule) => rule.test(plate));
};

export const normalizePlateOrEmpty = (value: unknown) => {
  const plate = normalizePlate(value);
  return isValidPlate(plate) ? plate : '';
};