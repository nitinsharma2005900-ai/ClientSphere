import 'dotenv/config';
import { Worker, Queue } from 'bullmq';
import IORedis from 'ioredis';
import http from 'http';
import { db } from './db/client';
import { config } from './config';
import { WorkflowEngine } from './services/workflow/workflow.engine';

const connection = new IORedis(config.redisUrl, { maxRetriesPerRequest: null });
connection.on('error', () => console.error('Worker Redis connection unavailable'));
const queue = new Queue('clientsphere-automation', { connection: connection as any });
const worker = new Worker('clientsphere-automation', async job => {
  try { return await WorkflowEngine.execute(job.data.executionId); }
  catch (error: any) {
    await db.workflowExecution.update({ where: { id: job.data.executionId }, data: { status: job.attemptsMade >= 2 ? 'FAILED' : 'RETRYING', retryCount: job.attemptsMade + 1, error: 'Workflow execution failed; inspect worker logs.' } });
    console.error('Workflow execution failed', job.data.executionId, error.message);
    throw error;
  }
}, { connection: connection.duplicate() as any, concurrency: 5 });
worker.on('error', error => console.error('Worker error:', error.message));
let polling = false;
async function dispatch() {
  if (polling) return;
  polling = true;
  try {
    const executions = await db.workflowExecution.findMany({ where: { status: 'QUEUED' }, take: 100, orderBy: { createdAt: 'asc' } });
    for (const execution of executions) {
      const previous = await queue.getJob(execution.id);
      if (previous && await previous.getState() === 'failed') await previous.remove();
      await queue.add('EXECUTE_WORKFLOW', { executionId: execution.id }, { jobId: execution.id, delay: Math.max(0, execution.availableAt.getTime() - Date.now()), attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: { age: 86400 }, removeOnFail: false });
    }
    await connection.set('clientsphere:worker:heartbeat', new Date().toISOString(), 'EX', 30);
  } catch (error: any) { console.error('Worker dispatch unavailable:', error.message); }
  finally { polling = false; }
}
const timer = setInterval(dispatch, 2000);
void dispatch();
const server = http.createServer(async (req, res) => {
  try { await connection.ping(); await db.$queryRaw`SELECT 1`; res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ status: 'ready', worker: worker.isRunning() })); }
  catch { res.writeHead(503); res.end('unready'); }
}).listen(Number(process.env.PORT || 4001), '0.0.0.0');
async function shutdown() { clearInterval(timer); server.close(); await worker.close(); await queue.close(); await connection.quit(); await db.$disconnect(); process.exit(0); }
process.on('SIGTERM', shutdown); process.on('SIGINT', shutdown);
console.log('ClientSphere automation consumer started');
