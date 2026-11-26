import { seedInitialData } from './seed';
import { db } from './client';
seedInitialData().finally(() => db.$disconnect()).catch(() => { process.exitCode = 1; });
