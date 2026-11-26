import { Request, Response, NextFunction } from 'express';
import { db } from '../db/client';
import { intelligence } from '../services/intelligence';
import PDFDocument from 'pdfkit';

async function data(req: Request) {
  const organizationId = req.user!.organizationId;
  const rep = req.user!.role === 'SALES_REPRESENTATIVE';
  const opportunities = await db.opportunity.findMany({ where: { organizationId, ...(rep ? { OR: [{ ownerId: req.user!.id }, { teamMembers: { some: { userId: req.user!.id } } }] } : {}) }, include: { stage: true } });
  const input = opportunities.map(o => ({ id: o.id, title: o.title, value: o.value, stage: o.stage.name, probability: o.probability, status: o.status, expectedCloseDate: o.expectedCloseDate?.toISOString(), actualCloseDate: o.actualCloseDate?.toISOString() }));
  return { organizationId, opportunities, input };
}
export class AnalyticsController {
  static async getDashboardMetrics(req: Request, res: Response, next: NextFunction) {
    try {
      const { organizationId, opportunities, input } = await data(req);
      const rep = req.user!.role === 'SALES_REPRESENTATIVE';
      const scope = { organizationId, ...(rep ? { ownerId: req.user!.id } : {}) };
      const [leads, totalContacts, totalCompanies, recentActivitiesCount, stages] = await Promise.all([
        db.lead.findMany({ where: scope, select: { priorityTier: true } }), db.contact.count({ where: scope }), db.company.count({ where: scope }),
        db.activity.count({ where: { organizationId, ...(rep ? { userId: req.user!.id } : {}) } }),
        db.pipelineStage.findMany({ where: { pipeline: { organizationId } }, orderBy: { order: 'asc' } }),
      ]);
      const open = opportunities.filter(o => o.status === 'OPEN'), won = opportunities.filter(o => o.status === 'WON'), closed = opportunities.filter(o => o.status !== 'OPEN');
      const winRate = closed.length ? won.length / closed.length : 0;
      const cycles = closed.filter(o => o.actualCloseDate).map(o => Math.max(1, (o.actualCloseDate!.getTime() - o.createdAt.getTime()) / 86400000));
      const cycle = cycles.length ? cycles.reduce((a,b) => a+b, 0) / cycles.length : 34.5;
      const velocity = await intelligence('/analytics/sales-velocity', { opportunities: input, historicalWinRate: winRate, averageCycleDays: cycle });
      res.json({ success: true, data: {
        kpis: { totalPipelineValue: open.reduce((s,o) => s+o.value,0), totalWonRevenue: won.reduce((s,o) => s+o.value,0), weightedForecast: open.reduce((s,o) => s+o.value*o.probability,0), winRate, avgDealSize: velocity.averageDealSize, salesVelocityPerDay: velocity.velocityPerDay, salesCycleDays: cycle, monthlyProjectedRevenue: velocity.projectedMonthlyRevenue, totalLeads: leads.length, totalContacts, totalCompanies, totalOpportunities: opportunities.length, openDealsCount: open.length, wonDealsCount: won.length },
        leadDistribution: { hot: leads.filter(l => l.priorityTier === 'HOT').length, warm: leads.filter(l => l.priorityTier === 'WARM').length, cold: leads.filter(l => l.priorityTier === 'COLD').length, total: leads.length },
        conversionWaterfall: stages.map(stage => { const deals = opportunities.filter(o => o.stageId === stage.id); return { stageId: stage.id, stageName: stage.name, order: stage.order, color: stage.color, dealCount: deals.length, totalValue: deals.reduce((s,o) => s+o.value,0), probability: stage.winProbability }; }), recentActivitiesCount,
      } });
    } catch (error) { next(error); }
  }
  static async forecast(req: Request) {
    const { input, opportunities } = await data(req);
    const result = await intelligence('/analytics/forecast', input);
    return { summary: { closedWonValue: opportunities.filter(o => o.status === 'WON').reduce((s,o) => s+o.value,0), commitValue: result.commitPipeline, weightedValue: result.weightedPipeline, bestCaseValue: result.bestCasePipeline, totalOpenPipeline: opportunities.filter(o => o.status === 'OPEN').reduce((s,o) => s+o.value,0) }, quarterlyForecast: result.quarterlyProjections.map((q: any) => ({ quarter: q.quarter, closed: q.closedWon, commit: q.commit, weighted: q.weighted, bestCase: q.bestCase })), assumptions: result.assumptions };
  }
  static async getForecast(req: Request, res: Response, next: NextFunction) {
    try { res.json({ success: true, data: await AnalyticsController.forecast(req) }); } catch (error) { next(error); }
  }
  static async downloadPdf(req: Request, res: Response, next: NextFunction) {
    try {
      const forecast = await AnalyticsController.forecast(req);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="clientsphere-sales-forecast.pdf"');
      const doc = new PDFDocument({ margin: 50 }); doc.pipe(res);
      doc.fontSize(24).fillColor('#7C3AED').text('ClientSphere Sales Forecast');
      doc.moveDown().fontSize(10).fillColor('#0B132B').text(`Generated: ${new Date().toISOString()}`);
      for (const [key, value] of Object.entries(forecast.summary)) doc.moveDown().text(`${key}: $${Number(value).toLocaleString('en-US')}`);
      doc.moveDown().fontSize(14).text('Quarterly forecast');
      for (const quarter of forecast.quarterlyForecast) doc.moveDown().fontSize(10).text(`${quarter.quarter}: weighted $${quarter.weighted.toFixed(2)}; commit $${quarter.commit.toFixed(2)}`);
      doc.moveDown().fontSize(14).text('Assumptions');
      for (const assumption of forecast.assumptions) doc.moveDown().fontSize(10).text(assumption);
      doc.end();
    } catch (error) { next(error); }
  }
}
