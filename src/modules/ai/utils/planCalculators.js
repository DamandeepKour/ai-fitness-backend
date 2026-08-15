export const calculateBMI = (weight, height) => {
  const h = height / 100;
  return Number((weight / (h * h)).toFixed(2));
};

export const calculateCalories = (weight, goal) => {
  const base = weight * 30;
  if (goal === "fat_loss" || goal === "weight_loss" || goal === "lose") {
    return Math.round(base - 500);
  }
  if (goal === "muscle_gain" || goal === "gain") {
    return Math.round(base + 300);
  }
  if (goal === "body_recomp") {
    // Modest deficit + high protein — recomposition, not a straight cut.
    return Math.round(base - 150);
  }
  // maintenance / maintain (and any unrecognized goal) — hold at baseline.
  return Math.round(base);
};

export const calculateSteps = (goal) => {
  if (goal === "fat_loss" || goal === "weight_loss" || goal === "lose") return 10000;
  if (goal === "muscle_gain" || goal === "gain") return 8000;
  if (goal === "body_recomp") return 9000;
  return 7000;
};
