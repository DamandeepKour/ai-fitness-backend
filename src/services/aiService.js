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
${data.ai_prompt ? `User custom meal request: ${data.ai_prompt}` : ""}

IMPORTANT:
- Follow Indian meals strictly
- Maintain calorie distribution
- Give realistic workout

FORMAT:

{
  "diet_plan": [
    {
      "day": "Monday",
      "meals": {
        "breakfast": {"food": "", "calories": 0},
        "mid_morning_snack": {"food": "", "calories": 0},
        "lunch": {"food": "", "calories": 0},
        "evening_snack": {"food": "", "calories": 0},
        "dinner": {"food": "", "calories": 0},
        "cheat_meal": {"food": "", "day": "${data.cheat_day || ""}"}
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
      diet_plan: ensureWeeklyPlan(parsed.diet_plan, isWeekly),
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
            breakfast: { food: "chai + poha + peanuts", calories: 350 },
            lunch: { food: "rajma + rice + raita", calories: 600 },
            dinner: { food: "roti + paneer + salad", calories: 500 },
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