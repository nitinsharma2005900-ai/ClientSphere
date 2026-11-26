import '../config';
import { PrismaClient } from '@prisma/client';

// PostgreSQL is the sole system of record; never fall back to ephemeral files.
export const db = new PrismaClient();
export const isUsingPrisma = () => true;
