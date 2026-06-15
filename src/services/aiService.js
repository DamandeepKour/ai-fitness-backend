import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";
import parseDietType from "../utils/dietHelper.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ================= HELPERS =================

const calculateBMI = (weight, height) => {
  const h = height / 100;
  return (weight / (h * h)).toFixed(2);
};

const calculateCalories = (weight, goal) => {
  let base = weight * 30;

  if (goal === "fat_loss") return Math.round(base - 500);
  if (goal === "muscle_gain") return Math.round(base + 300);

  return Math.round(base);
};

const calculateSteps = (goal) => {
  if (goal === "fat_loss") return 10000;
  if (goal === "muscle_gain") return 8000;
  return 7000;
};

// Ensure weekly structure
const ensureWeeklyPlan = (plan, isWeekly) => {
  if (!Array.isArray(plan)) return [];

  if (!isWeekly) return plan.slice(0, 1);

  const days = [
    "Monday","Tuesday","Wednesday","Thursday",
    "Friday","Saturday","Sunday"
  ];

  const map = {};
  plan.forEach((d) => (map[d.day] = d));

  return days.map((day) => map[day] || { day, meals: {} });
};

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

const normalizeDietPlan = (plan, isWeekly) => {
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

// ================= MAIN FUNCTION =================

const generateAIPlan = async (data) => {
  try {
    const bmi = calculateBMI(data.weight, data.height);
    const calories = calculateCalories(data.weight, data.goal);
    const steps = calculateSteps(data.goal);

    const isWeekly = data.plan_type === "weekly";

    const planInstruction = isWeekly
      ? "Generate FULL 7 days plan (Monday to Sunday)"
      : "Generate ONLY 1 day plan";

    // ===== WORKOUT TYPE =====
    let workoutInstruction = "";

    if (data.workout_type === "home") {
      workoutInstruction = `
Use HOME workouts:
jumping jacks, squats, lunges, high knees, skipping, yoga, planks.
`;
    }

    if (data.workout_type === "gym") {
      workoutInstruction = `
Use GYM workouts:
treadmill, cycling, weight training, deadlifts, bench press.
`;
    }

    if (data.workout_type === "mix") {
      workoutInstruction = `
Use MIX workouts:
running, walking, zumba + strength training.
`;
    }

    // ===== DIET RULES =====
    const dietRules = parseDietType(data.diet_type);

    let dietInstruction = "";

    if (dietRules.isVeg && !dietRules.isEgg) {
      dietInstruction = "Strict vegetarian diet.";
    }

    if (dietRules.isVeg && dietRules.isEgg) {
      dietInstruction = "Vegetarian + eggs allowed.";
    }

    if (dietRules.isNonVeg) {
      dietInstruction = "Non-vegetarian diet allowed.";
    }

    // ===== INDIAN FOOD CONTROL =====
    let foodInstruction = "";

    if (data.meal_preference === "north_indian") {
      foodInstruction = `
Use North Indian meals:

Breakfast:
chai + poha / upma / veg vermicelli / paneer sandwich + peanuts

Lunch:
rajma + rice + raita + salad
or kadhi + roti + salad
or dal + roti + sabzi + curd

Dinner:
roti + paneer sabzi + cucumber salad
or soya tikki + curd + salad
or veg oats

Snacks:
chai + rusk / peanuts / makhana / biscuits

Cheat meal:
paratha (paneer/aloo/gobi) + butter
`;
    }

    if (data.meal_preference === "south_indian") {
      foodInstruction = `
Use South Indian meals:
idli, dosa, appam, upma, sambar, coconut chutney.
`;
    }

    // ===== CHEAT =====
    const cheatInstruction = data.include_cheat_meal
      ? `Include cheat meal ONLY on ${data.cheat_day}`
      : `No cheat meal`;

    // ===== PANTRY MODE =====
    let pantryInstruction = "";
    if (data.pantry_mode && Array.isArray(data.pantry_items) && data.pantry_items.length) {
      pantryInstruction = `
PANTRY MODE — use these pantry essentials as the primary meal ingredients:
${data.pantry_items.join(", ")}
Build meals around these pantry items and avoid ingredients outside this list unless they are water, tea, lemon, common spices, salt, herbs, or basic cooking oil.
If the pantry cannot support a complete meal, use the closest pantry-based meal and keep any extra ingredient minimal.
Mention pantry items directly in the food names so the user can see they were used.
`;
    }

    // ===== BUDGET =====
    let budgetInstruction = "";
    const budgetMap = {
      budget: "₹150/day — dal, roti, seasonal sabzi, eggs, local grains. No expensive imports.",
      standard: "₹250/day — paneer, chicken 2x/week, variety snacks.",
      premium: "₹400/day — fish, nuts, premium protein, variety.",
    };
    if (data.budget_tier && budgetMap[data.budget_tier]) {
      budgetInstruction = `BUDGET CONSTRAINT: ${budgetMap[data.budget_tier]}`;
    }

    // ================= AI CALL =================

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "llama-3.1-8b-instant",
      response_format: { type: "json_object" },

      messages: [
        {
          role: "system",
          content: "You are a strict JSON generator fitness AI.",
        },
        {
          role: "user",
          content: `
${planInstruction}

STRICT RULES:
- Only JSON
- No explanation
- No markdown

USER DATA:
Weight: ${data.weight}
Height: ${data.height}
Goal: ${data.goal}
Calories Target: ${calories}
Steps Target: ${steps}

${dietInstruction}
${foodInstruction}
${workoutInstruction}
${cheatInstruction}
${pantryInstruction}
${budgetInstruction}
${data.ai_prompt ? `User custom meal request: ${data.ai_prompt}` : ""}

IMPORTANT:
- Follow Indian meals strictly
- Maintain calorie distribution
- Give realistic workout
- Every day must include these meal slots in this exact display order:
  morning_drink, breakfast, mid_morning_snack, lunch, evening_snack, dinner, after_dinner
- morning_drink is the early morning drink. Examples: jeera water, jeera saunf water, aloe vera juice + warm water, chia seeds water
- After dinner examples: green tea, jeera water, saunf water
- For every meal slot include food, calories, energy, protein, carbs, fibre, and sugar
- energy must match calories in kcal

FORMAT:

{
  "diet_plan": [
    {
      "day": "Monday",
      "meals": {
        "morning_drink": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0},
        "breakfast": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0},
        "mid_morning_snack": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0},
        "lunch": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0},
        "evening_snack": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0},
        "dinner": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0},
        "after_dinner": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0},
        "cheat_meal": {"food": "", "calories": 0, "energy": 0, "protein": 0, "carbs": 0, "fibre": 0, "sugar": 0, "day": "${data.cheat_day || ""}"}
      }
    }
  ],

  "workout_plan": [
    {
      "day": "Monday",
      "type": "${data.workout_type}",
      "exercise": "",
      "duration": 0,
      "calories_burned": 0,
      "steps": ${steps}
    }
  ],

  "daily_routine": {
    "morning": "",
    "evening": "",
    "before_bedtime": ""
  }
}
          `,
        },
      ],
    });

    const parsed = JSON.parse(response.choices[0].message.content);

    return {
      bmi,
      calories,
      steps,
      diet_plan: normalizeDietPlan(parsed.diet_plan, isWeekly),
      workout_plan: ensureWeeklyPlan(parsed.workout_plan, isWeekly),
      daily_routine: parsed.daily_routine || {},
    };

  } catch (error) {
    console.error("❌ AI ERROR:", error.message);

    // ===== SAFE FALLBACK =====
    return {
      bmi: 25,
      calories: 2000,
      steps: 8000,
      diet_plan: [
        {
          day: "Monday",
          meals: {
            morning_drink: { food: "jeera saunf water", calories: 5, energy: 5, protein: 0, carbs: 1, fibre: 0, sugar: 0 },
            breakfast: { food: "chai + poha + peanuts", calories: 350, energy: 350, protein: 12, carbs: 48, fibre: 5, sugar: 6 },
            mid_morning_snack: { food: "curd + cucumber", calories: 120, energy: 120, protein: 7, carbs: 10, fibre: 2, sugar: 5 },
            lunch: { food: "rajma + rice + raita", calories: 600, energy: 600, protein: 24, carbs: 88, fibre: 12, sugar: 7 },
            evening_snack: { food: "makhana + green tea", calories: 140, energy: 140, protein: 4, carbs: 26, fibre: 3, sugar: 1 },
            dinner: { food: "roti + paneer + salad", calories: 500, energy: 500, protein: 24, carbs: 46, fibre: 8, sugar: 6 },
            after_dinner: { food: "green tea", calories: 2, energy: 2, protein: 0, carbs: 0, fibre: 0, sugar: 0 },
          },
        },
      ],
      workout_plan: [
        {
          day: "Monday",
          type: "home",
          exercise: "walking + squats + jumping jacks",
          duration: 40,
          calories_burned: 300,
          steps: 8000,
        },
      ],
      daily_routine: {},
    };
  }
};

export default generateAIPlan;