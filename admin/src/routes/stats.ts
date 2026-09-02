import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const [
      totalCandidates,
      totalUsers,
      totalEvaluations,
      totalProposals,
      totalCargos,
      totalElectionYears,
      crawlerStatus,
      recentUsers,
      partyCountsRaw,
      cargoCountsRaw,
    ] = await Promise.all([
      prisma.candidate.count(),
      prisma.user.count(),
      prisma.userEvaluation.count(),
      prisma.proposal.count(),
      prisma.cargo.count(),
      prisma.electionYear.count(),
      prisma.crawlerStatus.findUnique({ where: { id: 'default' } }),
      prisma.user.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, name: true, email: true, role: true, createdAt: true },
      }),
      prisma.candidate.groupBy({
        by: ['party'],
        _count: { party: true },
        orderBy: { _count: { party: 'desc' } },
        take: 10,
      }),
      prisma.candidate.groupBy({
        by: ['cargoId'],
        _count: { cargoId: true },
      }),
    ]);

    // Format cargo names
    const cargosList = await prisma.cargo.findMany({ select: { id: true, name: true } });
    const cargoNameMap = new Map(cargosList.map((c) => [c.id, c.name]));

    const cargoBreakdown = cargoCountsRaw.map((item) => ({
      cargo: cargoNameMap.get(item.cargoId) || 'Outro',
      count: item._count.cargoId,
    }));

    const partyBreakdown = partyCountsRaw.map((item) => ({
      party: item.party,
      count: item._count.party,
    }));

    // Monthly signups (last 6 months)
    const userRegistrationTimeline = await prisma.$queryRaw`
      SELECT DATE_TRUNC('month', "createdAt") as month, COUNT(*)::int as count
      FROM users
      GROUP BY month
      ORDER BY month ASC
      LIMIT 12
    `;

    return res.json({
      metrics: {
        totalCandidates,
        totalUsers,
        totalEvaluations,
        totalProposals,
        totalCargos,
        totalElectionYears,
      },
      partyBreakdown,
      cargoBreakdown,
      userRegistrationTimeline,
      recentUsers,
      crawlerStatus: crawlerStatus || { status: 'desativado', candidatesFetched: 0, lastHeartbeat: null },
    });
  } catch (err: any) {
    console.error('Error fetching admin stats:', err);
    return res.status(500).json({ error: 'Erro ao carregar estatísticas do banco de dados.', details: err.message });
  }
});

export default router;
