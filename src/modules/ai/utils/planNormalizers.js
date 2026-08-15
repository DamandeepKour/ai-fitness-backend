const MEAL_KEYS = [
  "morning_drink",
  "breakfast",
  "mid_morning_snack",
  "lunch",
  "evening_snack",
  "dinner",
  "after_dinner",
];

const toNumber = (value) => Number(value || 0);

const ensureWeeklyPlan = (plan, isWeekly) => {
  if (!Array.isArray(plan)) return [];
  if (!isWeekly) return plan.slice(0, 1);

  const days = [
    "Monday", "Tuesday", "Wednesday", "Thursday",
    "Friday", "Saturday", "Sunday",
  ];

  const map = {};
  plan.forEach((d) => {
    map[d.day] = d;
  });

  return days.map((day) => map[day] || { day, meals: {} });
};

const normalizeMeal = (meal = {}, fallbackCalories = 0) => {
  const calories = toNumber(meal.calories || meal.energy || fallbackCalories);

  return {
    food: meal.food || "",
    calories,
    energy: toNumber(meal.energy || calories),
    protein: toNumber(meal.protein),
    carbs: toNumber(meal.carbs),
    fibre: toNumber(meal.fibre || meal.fiber),
    sugar: toNumber(meal.sugar),
  };
};

export const normalizeDietPlan = (plan, isWeekly) => {
  const ensuredPlan = ensureWeeklyPlan(plan, isWeekly);

  return ensuredPlan.map((day) => {
    const meals = day?.meals && typeof day.meals === "object" ? day.meals : {};
    const normalizedMeals = {};

    MEAL_KEYS.forEach((mealKey) => {
      normalizedMeals[mealKey] = normalizeMeal(meals[mealKey]);
    });

    if (meals.cheat_meal?.food) {
      normalizedMeals.cheat_meal = normalizeMeal(meals.cheat_meal);
    }

    return {
      day: day.day,
      meals: normalizedMeals,
    };
  });
};

export const normalizeWorkoutPlan = (plan, isWeekly) => {
  const ensuredPlan = ensureWeeklyPlan(plan, isWeekly);

  return ensuredPlan.map((day) => ({
    day: day.day,
    type: day.type || "home",
    focus: day.focus || "balanced",
    warmup: day.warmup || "",
    exercise: day.exercise || "",
    yoga_balance: day.yoga_balance || "",
    duration: toNumber(day.duration),
    calories_burned: toNumber(day.calories_burned),
    steps: toNumber(day.steps),
    intensity: day.intensity || "moderate",
    injury_notes: day.injury_notes || "",
  }));
};

export function normalizePlanResponse(parsed, context) {
  const { bmi, calories, steps, isWeekly } = context;

  return {
    bmi,
    calories,
    steps,
    diet_plan: normalizeDietPlan(parsed.diet_plan, isWeekly),
    workout_plan: normalizeWorkoutPlan(parsed.workout_plan, isWeekly),
    daily_routine: parsed.daily_routine || {},
  };
}
