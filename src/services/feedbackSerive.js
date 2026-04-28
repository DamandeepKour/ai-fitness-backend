import Groq from "groq-sdk";
import { getWeeklyWeight } from "../repositories/weightRepo.js";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const getAIFeedbackService = async (userId) => {
  const weightData = await getWeeklyWeight(userId);

  const response = await client.chat.completions.create({
    model: process.env.AI_MODEL,
    messages: [
      {
        role: "system",
        content: "You are a fitness expert AI.",
      },
      {
        role: "user",
        content: `
User weight trend:
${JSON.stringify(weightData)}

Tell why user is not losing weight and give suggestions.
        `,
      },
    ],
  });

  return response.choices[0].message.content;
};