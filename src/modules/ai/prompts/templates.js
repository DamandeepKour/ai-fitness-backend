import parseDietType from "../../meals/dietHelper.js";
import { calculateBMI, calculateCalories, calculateSteps } from "../utils/planCalculators.js";

const WORKOUT_INSTRUCTIONS = {
  home: "Use HOME workouts: jumping jacks, squats, lunges, high knees, skipping, yoga, planks.",
  gym: "Use GYM workouts: treadmill, cycling, weight training, deadlifts, bench press.",
  mix: "Use MIX workouts: running, walking, zumba + strength training.",
  cardio: "Use CARDIO coaching: walking, brisk walk intervals, cycling, low-impact cardio, step-ups, and mobility cooldown.",
  yoga: "Use YOGA + BALANCE coaching: surya namaskar modifications, cat-cow, child pose, low lunge, bridge, tree pose, breathing, and gentle mobility.",
};

const WORKOUT_FOCUS_MAP = {
  balanced: "balanced strength + cardio + mobility",
  strength: "strength and muscle tone",
  cardio: "cardio stamina and heart health",
  yoga_mobility: "yoga, balance, flexibility, and recovery",
  injury_safe: "injury-safe low-impact training with conservative progressions",
  weight_loss: "fat loss with cardio + strength balance",
};

const FOOD_INSTRUCTIONS = {
  north_indian: `
Use North Indian meals:
Breakfast: chai + poha / upma / veg vermicelli / paneer sandwich + peanuts
Lunch: rajma + rice + raita + salad or kadhi + roti + salad or dal + roti + sabzi + curd
Dinner: roti + paneer sabzi + cucumber salad or soya tikki + curd + salad or veg oats
Snacks: chai + rusk / peanuts / makhana / biscuits
Cheat meal: paratha (paneer/aloo/gobi) + butter`,
  south_indian: "Use South Indian meals: idli, dosa, appam, upma, sambar, coconut chutney.",
};

const BUDGET_MAP = {
  budget: "₹150/day — dal, roti, seasonal sabzi, eggs, local grains. No expensive imports.",
  standard: "₹250/day — paneer, chicken 2x/week, variety snacks.",
  premium: "₹400/day — fish, nuts, premium protein, variety.",
};

function buildDietInstruction(dietType) {
  const dietRules = parseDietType(dietType);
  if (dietRules.isVeg && !dietRules.isEgg) return "Strict vegetarian diet.";
  if (dietRules.isVeg && dietRules.isEgg) return "Vegetarian + eggs allowed.";
  if (dietRules.isNonVeg) return "Non-vegetarian diet allowed.";
  return "Balanced diet.";
}

export function buildPlanPrompt(data) {
  const bmi = calculateBMI(data.weight, data.height);
  const calories = calculateCalories(data.weight, data.goal);
  const steps = calculateSteps(data.goal);
  const isWeekly = data.plan_type === "weekly";

  const planInstruction = isWeekly
    ? "Generate FULL 7 days plan (Monday to Sunday)"
    : "Generate ONLY 1 day plan";

  const workoutInstruction = WORKOUT_INSTRUCTIONS[data.workout_type] || WORKOUT_INSTRUCTIONS.home;
  const workoutCoachingInstruction = `
WORKOUT COACH REQUEST:
Workout type: ${data.workout_type || "home"}
Workout focus: ${WORKOUT_FOCUS_MAP[data.workout_focus] || WORKOUT_FOCUS_MAP.balanced}
Injury notes: ${data.injury_notes || "none"}
Build a practical plan for the selected setting: home workout, gym, cardio, or yoga/balance.
If injury notes are present, avoid risky moves and include safe substitutions. Add a short "injury_notes" coaching line for each day.
Every workout day must include warmup, main exercise, yoga_balance or mobility work, duration, calories_burned, steps, intensity, and injury_notes.`;

  const dietInstruction = buildDietInstruction(data.diet_type);
  const foodInstruction = FOOD_INSTRUCTIONS[data.meal_preference] || "";
  const cheatInstruction = data.include_cheat_meal
    ? `Include cheat meal ONLY on ${data.cheat_day}`
    : "No cheat meal";

  let pantryInstruction = "";
  if (data.pantry_mode && Array.isArray(data.pantry_items) && data.pantry_items.length) {
    pantryInstruction = `
PANTRY MODE — use these pantry essentials as the primary meal ingredients:
${data.pantry_items.join(", ")}
Build meals around these pantry items and avoid ingredients outside this list unless they are water, tea, lemon, common spices, salt, herbs, or basic cooking oil.`;

  }

  const budgetInstruction = data.budget_tier && BUDGET_MAP[data.budget_tier]
    ? `BUDGET CONSTRAINT: ${BUDGET_MAP[data.budget_tier]}`
    : "";

  const userPrompt = `
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
${workoutCoachingInstruction}
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
- Workout plan must match the workout coach request, include yoga/balance support, and respect injury notes

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
      "type": "${data.workout_type || "home"}",
      "focus": "${data.workout_focus || "balanced"}",
      "warmup": "",
      "exercise": "",
      "yoga_balance": "",
      "duration": 0,
      "calories_burned": 0,
      "steps": ${steps},
      "intensity": "moderate",
      "injury_notes": ""
    }
  ],
  "daily_routine": {
    "morning": "",
    "evening": "",
    "before_bedtime": ""
  }
}`;

  return {
    messages: [
      { role: "system", content: "You are a strict JSON generator fitness AI for FitNova." },
      { role: "user", content: userPrompt },
    ],
    context: { bmi, calories, steps, isWeekly },
  };
}

export function buildCoachingPrompt({ user, weightData = [], pantry = [] }) {
  const language = user.language || "en";
  const hindi = String(language).toLowerCase().includes("hi")
    || String(language).toLowerCase().includes("hindi")
    || language === "हिंदी";

  const langInstruction = hindi
    ? `Respond in BOTH Hindi (Devanagari) and English. Format:
हिंदी: <2-3 sentences in Hindi>
English: <2-3 sentences in English>`
    : `Respond in English with 1 short Hindi phrase for motivation (e.g. "Shabash! Keep going!").`;

  return {
    messages: [
      {
        role: "system",
        content: "You are FitNova — an Indian fitness coach who understands dal-roti, tiffin culture, and regional eating habits. Be warm, practical, and concise.",
      },
      {
        role: "user",
        content: `
User: ${user.name || "Member"}
Goal: ${user.goal || "general fitness"}
Diet: ${user.diet_type || "balanced"}
Weight trend (last entries): ${JSON.stringify(weightData)}
Pantry items available: ${pantry.length ? pantry.join(", ") : "not set — suggest using Pantry Mode"}

Give personalized coaching for today. Mention Indian food context when relevant.
${langInstruction}`,
      },
    ],
    context: { language, hindi, pantryAware: pantry.length > 0 },
  };
}

export function buildFeedbackPrompt(weightData = []) {
  return {
    messages: [
      { role: "system", content: "You are a fitness expert AI for FitNova." },
      {
        role: "user",
        content: `
User weight trend:
${JSON.stringify(weightData)}

Tell why user is not losing weight and give practical suggestions.`,
      },
    ],
  };
}
