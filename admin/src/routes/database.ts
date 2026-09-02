import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /admin/api/database/tables - List available tables & row counts
router.get('/tables', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const tableCounts: Record<string, number> = {
      users: await prisma.user.count(),
      candidates: await prisma.candidate.count(),
      user_evaluations: await prisma.userEvaluation.count(),
      user_settings: await prisma.userSettings.count(),
      cargos: await prisma.cargo.count(),
      election_years: await prisma.electionYear.count(),
      proposals: await prisma.proposal.count(),
      career_items: await prisma.careerItem.count(),
      controversies: await prisma.controversy.count(),
      public_performances: await prisma.publicPerformance.count(),
      candidate_annotations: await prisma.candidateAnnotation.count(),
      crawler_status: await prisma.crawlerStatus.count(),
    };

    return res.json({
      tables: Object.entries(tableCounts).map(([name, count]) => ({ name, count })),
    });
  } catch (err: any) {
    console.error('Error fetching tables:', err);
    return res.status(500).json({ error: 'Erro ao listar tabelas do banco.', details: err.message });
  }
});

// GET /admin/api/database/table/:name - Fetch paginated rows of a specific table
router.get('/table/:name', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { name } = req.params;
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const skip = (page - 1) * limit;

    let rows: any[] = [];
    let total = 0;

    switch (name.toLowerCase()) {
      case 'users':
        rows = await prisma.user.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } });
        total = await prisma.user.count();
        break;
      case 'candidates':
        rows = await prisma.candidate.findMany({ skip, take: limit, orderBy: { updatedAt: 'desc' } });
        total = await prisma.candidate.count();
        break;
      case 'user_evaluations':
        rows = await prisma.userEvaluation.findMany({ skip, take: limit, orderBy: { updatedAt: 'desc' } });
        total = await prisma.userEvaluation.count();
        break;
      case 'user_settings':
        rows = await prisma.userSettings.findMany({ skip, take: limit });
        total = await prisma.userSettings.count();
        break;
      case 'cargos':
        rows = await prisma.cargo.findMany({ skip, take: limit });
        total = await prisma.cargo.count();
        break;
      case 'election_years':
        rows = await prisma.electionYear.findMany({ skip, take: limit });
        total = await prisma.electionYear.count();
        break;
      case 'proposals':
        rows = await prisma.proposal.findMany({ skip, take: limit, orderBy: { createdAt: 'desc' } });
        total = await prisma.proposal.count();
        break;
      case 'public_performances':
        rows = await prisma.publicPerformance.findMany({ skip, take: limit });
        total = await prisma.publicPerformance.count();
        break;
      case 'crawler_status':
        rows = await prisma.crawlerStatus.findMany({ skip, take: limit });
        total = await prisma.crawlerStatus.count();
        break;
      default:
        return res.status(400).json({ error: `Tabela '${name}' não suportada.` });
    }

    return res.json({
      tableName: name,
      rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error querying table:', err);
    return res.status(500).json({ error: 'Erro ao consultar linhas da tabela.', details: err.message });
  }
});

// POST /admin/api/database/query - Direct SQL Query Console for Rapid Debugging
router.post('/query', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string' || !sql.trim()) {
      return res.status(400).json({ error: 'Insira a consulta SQL a ser executada.' });
    }

    const startTime = Date.now();
    const result: any = await prisma.$queryRawUnsafe(sql);
    const executionTimeMs = Date.now() - startTime;

    return res.json({
      success: true,
      sql,
      executionTimeMs,
      rowCount: Array.isArray(result) ? result.length : 1,
      rows: result,
    });
  } catch (err: any) {
    console.error('Error executing raw SQL query:', err);
    return res.status(400).json({ error: 'Erro de execução SQL.', details: err.message });
  }
});

export default router;
