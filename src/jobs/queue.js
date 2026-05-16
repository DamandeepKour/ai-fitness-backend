// src/jobs/queue.js

import { Queue } from "bullmq";
import IORedis from "ioredis";

function queueConnection() {
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is required for AI job queue");
  }

  const opts = { maxRetriesPerRequest: null };
  if (url.startsWith("rediss://")) {
    opts.tls = {};
  }

  return new IORedis(url, opts);
}

let aiQueue;

export function getAiQueue() {
  if (!aiQueue) {
    aiQueue = new Queue("ai-plan", { connection: queueConnection() });
  }
  return aiQueue;
}
