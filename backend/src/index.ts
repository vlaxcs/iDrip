import dotenv from 'dotenv';
dotenv.config();

import { createApp } from './app';
import { connectDB } from './config/db';
import { seed } from './seed/seed';

const PORT = process.env.PORT || 5000;

async function start() {
  await connectDB();
  if (process.env.SKIP_SEED !== 'true') {
    await seed();
  }
  const app = createApp();
  app.listen(PORT, () => {
    console.log(`iDrip Backend running on port ${PORT}`);
  });
}

start();
