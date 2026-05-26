import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import prisma from './config/db';

const start = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database connected');

    app.listen(env.port, () => {
      console.log(`🚀 Server running on port ${env.port} [${env.nodeEnv}]`);
    });
  } catch (err) {
    console.error('❌ Failed to start server', err);
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

start();
