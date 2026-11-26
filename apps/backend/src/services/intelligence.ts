import { config } from '../config';
import { AppError } from '../utils/errors';

export async function intelligence(path: string, payload: unknown) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetch(`${config.pythonServiceUrl}/api/v1${path}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload), signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`Intelligence returned ${response.status}`);
      return await response.json() as any;
    } catch (error) {
      if (attempt === 1) throw new AppError('Intelligence service is temporarily unavailable.', 503, 'SERVICE_UNAVAILABLE');
    }
  }
}
