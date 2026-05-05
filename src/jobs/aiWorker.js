// src/jobs/aiWorker.js

import { Worker } from "bullmq";
import IORedis from "ioredis";
import generateAIPlan from "../services/aiService.js";

const connection = new IORedis();

const worker = new Worker(
  "ai-plan",
  async (job) => {
    const { data } = job;

    const result = await generateAIPlan(data);

    return result;
  },
  { connection }
);

worker.on("completed", (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

worker.on("failed", (job, err) => {
  console.log(`❌ Job ${job.id} failed`, err);
});