import dotenv from "dotenv";
dotenv.config();

import Groq from "groq-sdk";
import parseDietType from "../utils/dietHelper.js";

const client = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

// ✅ Helpers
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

// ✅ Ensure weekly structure always correct
const ensureWeeklyPlan = (plan, isWeekly) => {
  if (!Array.isArray(plan)) return [];

  if (!isWeekly) return plan.slice(0, 1);

  const requiredDays = [
    "Monday","Tuesday","Wednesday","Thursday",
    "Friday","Saturday","Sunday"
  ];

  const map = {};
  plan.forEach((d) => (map[d.day] = d));

  return requiredDays.map((day) => map[day] || { day, meals: {} });
};

const generateAIPlan = async (data) => {
  try {
    const bmi = calculateBMI(data.weight, data.height);
    const calories = calculateCalories(data.weight, data.goal);
    const steps = calculateSteps(data.goal);

    const isWeekly = data.plan_type === "weekly";

    // ✅ PLAN CONTROL
    const planInstruction = isWeekly
      ? "Generate FULL 7 days plan from Monday to Sunday."
      : "Generate ONLY 1 day plan.";

    const daysFormat = isWeekly
      ? `["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]`
      : `["Monday"]`;

    // ✅ DIET RULES
    const dietRules = parseDietType(data.diet_type);

    let dietInstruction = "";

    if (dietRules.isVeg && !dietRules.isEgg) {
      dietInstruction = "Strict vegetarian. No eggs, no meat.";
    }

    if (dietRules.isVeg && dietRules.isEgg) {
      dietInstruction =
        "Vegetarian with eggs allowed. Include egg dishes. No chicken or fish.";
    }

    if (dietRules.isNonVeg) {
      dietInstruction =
        "Non-vegetarian diet. Include chicken, fish, eggs.";
    }

    // ✅ CHEAT MEAL LOGIC
    const cheatInstruction = data.include_cheat_meal
      ? `Include cheat meal ONLY on ${data.cheat_day}`
      : `Do NOT include any cheat meal`;

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "llama-3.1-8b-instant",

      response_format: { type: "json_object" },

      messages: [
        {
          role: "system",
          content: "You are a strict JSON generator AI.",
        },
        {
          role: "user",
          content: `
You are a professional fitness AI.

STRICT RULES:
- Return ONLY valid JSON
- No explanation
- No markdown
- Follow EXACT structure

IMPORTANT:
${planInstruction}
Days must be exactly: ${daysFormat}

${dietInstruction}
${cheatInstruction}

OUTPUT FORMAT:

{
  "diet_plan": [
    {
      "day": "Monday",
      "meals": {
        "breakfast": { "food": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
        "mid_morning_snack": { "food": "", "calories": 0 },
        "lunch": { "food": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
        "evening_snack": { "food": "", "calories": 0 },
        "dinner": { "food": "", "calories": 0, "protein": 0, "carbs": 0, "fat": 0 },
        "cheat_meal": { "food": "", "day": "${data.cheat_day || ""}" }
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

USER DATA:
Weight: ${data.weight}
Height: ${data.height}
Goal: ${data.goal}
Diet Type: ${data.diet_type}
Food Type: ${data.food_type}
Meal Preference: ${data.meal_preference}
Workout Preference: ${data.workout_type}
Steps Goal: ${steps}
          `,
        },
      ],
    });

    const text = response.choices[0].message.content;

    const parsed = JSON.parse(text);

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

    // 🔥 FAILSAFE
    return {
      bmi: 25,
      calories: 2000,
      steps: 8000,
      diet_plan: [],
      workout_plan: [],
      daily_routine: {},
    };
  }
};

export default generateAIPlan;