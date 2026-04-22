export const calculateBMI = (weight, height) => {
    const h = height / 100;
    return (weight / (h * h)).toFixed(2);
  };
  
  export const calculateCalories = (data) => {
    const { weight, height, age, gender, activity_level, goal } = data;
  
    // BMR (Mifflin St Jeor)
    let bmr =
      gender === "male"
        ? 10 * weight + 6.25 * height - 5 * age + 5
        : 10 * weight + 6.25 * height - 5 * age - 161;
  
    const activityMap = {
      low: 1.2,
      moderate: 1.55,
      high: 1.725,
    };
  
    const maintenance = bmr * (activityMap[activity_level] || 1.2);
  
    let target = maintenance;
  
    if (goal === "fat_loss") target -= 500;
    if (goal === "muscle_gain") target += 300;
  
    return Math.round(target);
  };
  
  export const calculateSteps = (goal) => {
    if (goal === "fat_loss") return 10000;
    if (goal === "muscle_gain") return 7000;
    return 8000;
  };