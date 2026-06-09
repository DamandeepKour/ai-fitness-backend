import Groq from "groq-sdk";
import db from "../config/db.js";
import { getWeeklyWeight } from "../repositories/weightRepo.js";
import { getPantryIngredientList } from "./pantryService.js";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

const FALLBACK_COACHING = {
  en: "You're building consistency — log one more meal today and stay within your calorie target. Small steps compound.",
  hi: "Aap consistency bana rahe hain — aaj ek aur meal log karein aur calorie target ke andar rahein. Chhote kadam bade badlav laate hain.",
};

function isHindi(language) {
  const lang = String(language || "").toLowerCase();
  return lang.includes("hi") || lang.includes("hindi") || lang === "हिंदी";
}

export async function getVernacularCoachingService(userId) {
  const conn = await db();
  const [users] = await conn.query(
    `SELECT language, goal, diet_type, name FROM users WHERE id = ?`,
    [userId],
  );
  const user = users[0] || {};
  const language = user.language || "en";
  const hindi = isHindi(language);

  let weightData = [];
  try {
    weightData = await getWeeklyWeight(userId);
  } catch {
    weightData = [];
  }

  let pantry = [];
  try {
    pantry = await getPantryIngredientList(userId);
  } catch {
    pantry = [];
  }

  const langInstruction = hindi
    ? `Respond in BOTH Hindi (Devanagari) and English. Format:
हिंदी: <2-3 sentences in Hindi>
English: <2-3 sentences in English>`
    : `Respond in English with 1 short Hindi phrase for motivation (e.g. "Shabash! Keep going!").`;

  try {
    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "llama-3.1-8b-instant",
      messages: [
        {
          role: "system",
          content: `You are AIFitnova — an Indian fitness coach who understands dal-roti, tiffin culture, and regional eating habits. Be warm, practical, and concise.`,
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
${langInstruction}
          `,
        },
      ],
    });

    const text = response.choices[0].message.content;
    return {
      coaching: text,
      language: hindi ? "hi-en" : "en-hi",
      pantryAware: pantry.length > 0,
    };
  } catch {
    return {
      coaching: hindi
        ? `हिंदी: ${FALLBACK_COACHING.hi}\nEnglish: ${FALLBACK_COACHING.en}`
        : `${FALLBACK_COACHING.en}\nहिंदी: ${FALLBACK_COACHING.hi}`,
      language: hindi ? "hi-en" : "en-hi",
      pantryAware: pantry.length > 0,
    };
  }
}
