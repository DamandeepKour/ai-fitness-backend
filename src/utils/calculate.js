export const calculateBMI = (weight, height) => {
    return weight && height ? (weight / (height * height)).toFixed(2) : null;
  };
  
  export const getGoalFromBMI = (bmi) => {
    if (!bmi) return "maintain";
    if (bmi > 25) return "fat_loss";
    if (bmi < 18) return "weight_gain";
    return "maintain";
  };