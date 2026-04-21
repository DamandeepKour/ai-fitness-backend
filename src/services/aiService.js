import dotenv from "dotenv";
dotenv.config();
import Groq from "groq-sdk";

export const generateAIPlan = async (data) => {
  try {
    // ✅ CREATE CLIENT HERE (AFTER ENV LOADS)
    const client = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const response = await client.chat.completions.create({
      model: process.env.AI_MODEL || "llama-3.1-8b-instant",
      response_format: { type: "json_object" },

      messages: [
        {
          role: "system",
          content: "You are a fitness AI that ONLY returns valid JSON.",
        },
        {
          role: "user",
          content: `
Generate a diet and workout plan.

User Details:
Weight: ${data.weight}
Goal: ${data.goal}
Diet: ${data.diet_type}

Return JSON:
{
  "diet_plan": [],
  "workout_plan": [],
  "calories": number
}
          `,
        },
      ],
    });

    const text = response.choices[0].message.content;

    const parsed = JSON.parse(text);
    console.log("✅ AI Response:", parsed);

    return {
      diet_plan: parsed.diet_plan || [],
      workout_plan: parsed.workout_plan || [],
      calories: parsed.calories || 0,
    };

  } catch (error) {
    console.error("❌ AI Error:", error.message);

    return {
      diet_plan: [],
      workout_plan: [],
      calories: 0,
    };
  }
};