// ClientSphere Backend Server Entry Point
// Developer: Nitin Sharma

import { app } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { seedInitialData } from './db/seed';
import { db } from './db/client';

const PORT = config.port;

async function bootstrap() {
  try {
    // Seed initial synthetic organization, 5 enterprise users, pipeline stages, and sample data
    await db.$connect();
    if (process.env.SEED_DEMO === 'true') await seedInitialData();

    const server = app.listen(PORT, '0.0.0.0', () => {
      logger.info(`ClientSphere Backend running on http://0.0.0.0:${PORT}`);
      logger.info(`API Base URL: http://0.0.0.0:${PORT}${config.apiPrefix}`);
      logger.info(`API Documentation: http://0.0.0.0:${PORT}/api/v1/docs`);
    });

    // Graceful shutdown handling
    const shutdown = (signal: string) => {
      logger.info(`Received ${signal}. Initiating graceful shutdown...`);
      server.close(async () => {
        await db.$disconnect();
        logger.info('HTTP server closed. Exiting process.');
        process.exit(0);
      });
      setTimeout(() => {
        logger.error('Forcefully exiting after timeout.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err: any) {
    logger.error(`Fatal error bootstrapping ClientSphere Backend: ${err.message}`, { stack: err.stack });
    process.exit(1);
  }
}

bootstrap();
