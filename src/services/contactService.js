import { insertContactMessage } from "../repositories/contactRepo.js";

export const submitContactMessage = async (body) => {
  const name = body.name.trim();
  const email = body.email.trim().toLowerCase();
  const message = body.message.trim();

  const { id } = await insertContactMessage({ name, email, message });

  return { id, name, email };
};
