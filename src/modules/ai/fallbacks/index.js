export function buildPlanFallback(context = {}) {
  const steps = context.steps ?? 8000;

  return {
    bmi: context.bmi ?? 25,
    calories: context.calories ?? 2000,
    steps,
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
        focus: "balanced",
        warmup: "5 min easy walk + shoulder rolls + hip circles",
        exercise: "3 rounds: chair squats 12 reps, wall push-ups 10 reps, glute bridges 12 reps, low-impact step jacks 30 sec",
        yoga_balance: "Cat-cow 8 reps + tree pose 20 sec each side + child pose breathing 1 min",
        duration: 40,
        calories_burned: 300,
        steps,
        intensity: "moderate",
        injury_notes: "Keep movements pain-free and replace jumps with marching if knees or back feel uncomfortable.",
      },
    ],
    daily_routine: {},
  };
}

export const COACHING_FALLBACK = {
  en: "You're building consistency — log one more meal today and stay within your calorie target. Small steps compound.",
  hi: "Aap consistency bana rahe hain — aaj ek aur meal log karein aur calorie target ke andar rahein. Chhote kadam bade badlav laate hain.",
};

export function buildCoachingFallback(hindi = false) {
  return hindi
    ? `हिंदी: ${COACHING_FALLBACK.hi}\nEnglish: ${COACHING_FALLBACK.en}`
    : `${COACHING_FALLBACK.en}\nहिंदी: ${COACHING_FALLBACK.hi}`;
}

export const FEEDBACK_FALLBACK = `Based on your recent weight trend, progress may be slow due to inconsistent logging, hidden calories in snacks, or insufficient daily movement.

Suggestions:
1. Log every meal for 7 days.
2. Aim for a modest calorie deficit with enough protein.
3. Walk 8,000–10,000 steps daily.
4. Weigh yourself at the same time each morning.
5. Review evening snack portions — they often stall fat loss.`;

export const PLAN_EXPLANATION_FALLBACK =
  "This plan sets a daily calorie target based on your weight and goal, builds meals around your diet type, " +
  "and pairs them with a workout focus suited to your goal. Stick with it for a week and adjust portions if you " +
  "feel too hungry or too full.";

export const MEAL_EXPLANATION_FALLBACK =
  "This meal contributes to your daily calorie and protein targets for this slot. If it feels too heavy or too " +
  "light for your goal, adjust the portion size rather than skipping the meal.";
