import { Router, Response } from 'express';
import { prisma } from '../config/db';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { calculateCandidateScore } from '../services/scoreCalculator';

const router = Router();

router.get('/', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, electionYearId, cargoCode, cargoId, search, state, page, limit } = req.query;

    let userSettings = null;
    let userEvaluationsMap: Record<string, any[]> = {};

    if (req.user) {
      userSettings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
      const evs = await prisma.userEvaluation.findMany({ where: { userId: req.user.id } });
      for (const ev of evs) {
        if (!userEvaluationsMap[ev.candidateId]) {
          userEvaluationsMap[ev.candidateId] = [];
        }
        userEvaluationsMap[ev.candidateId].push(ev);
      }
    } else if (req.headers['x-guest-settings']) {
      try {
        const guestData = JSON.parse(req.headers['x-guest-settings'] as string);
        if (guestData && typeof guestData === 'object') {
          userSettings = guestData;
        }
      } catch (e) {}
    }

    const where: any = {};

    if (year) {
      const yr = parseInt(year as string);
      where.electionYear = { year: yr };
    } else if (electionYearId) {
      where.electionYearId = electionYearId as string;
    }

    if (cargoCode && cargoCode !== 'ALL') {
      where.cargo = { code: cargoCode as string };
    } else if (cargoId) {
      where.cargoId = cargoId as string;
    }

    if (state === 'FEDERAL') {
      where.state = 'BR';
    } else if (state && state !== 'ALL' && cargoCode !== 'PRESIDENTE') {
      where.state = state as string;
    }

    if (search) {
      const query = (search as string).trim();
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { popularName: { contains: query, mode: 'insensitive' } },
        { party: { contains: query, mode: 'insensitive' } },
      ];
    }

    // Pagination batch settings
    const pageNum = page ? parseInt(page as string, 10) : 1;
    const limitNum = limit ? parseInt(limit as string, 10) : 24;
    const skip = (pageNum - 1) * limitNum;

    // Count total matching candidates
    const totalCount = await prisma.candidate.count({ where });

    // Fetch batch slice with Prisma take and skip
    const candidates = await prisma.candidate.findMany({
      where,
      skip,
      take: limitNum,
      include: {
        electionYear: true,
        cargo: true,
        proposals: { orderBy: { category: 'asc' } },
        careerItems: true,
        controversies: true,
        publicPerformance: true,
      },
      orderBy: { name: 'asc' },
    });

    const results = candidates.map((cand: any) => {
      const candidateEvs = userEvaluationsMap[cand.id] || [];
      const score = calculateCandidateScore(userSettings, candidateEvs, cand.careerItems, cand);
      return {
        ...cand,
        userEvaluations: candidateEvs,
        score,
      };
    });

    // Sort by total composite score descending by default
    results.sort((a: any, b: any) => b.score.totalCompositeScore - a.score.totalCompositeScore);

    const hasMore = skip + results.length < totalCount;

    return res.json({
      data: results,
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      hasMore,
    });
  } catch (error) {
    console.error('Error fetching candidates:', error);
    return res.status(500).json({ error: 'Erro ao buscar candidatos.' });
  }
});

router.get('/pdf-proxy', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const targetUrl = req.query.url as string;
    if (!targetUrl || !targetUrl.startsWith('http')) {
      return res.status(400).json({ error: 'URL inválida para download do PDF' });
    }
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao obter PDF na fonte oficial do TSE' });
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.send(buffer);
  } catch (err) {
    console.error('PDF Proxy error:', err);
    return res.status(500).json({ error: 'Erro no servidor proxy ao buscar PDF' });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;

    const candidate = await prisma.candidate.findUnique({
      where: { id },
      include: {
        electionYear: true,
        cargo: true,
        proposals: { orderBy: { category: 'asc' } },
        careerItems: true,
        controversies: true,
        publicPerformance: true,
      },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    let userSettings = null;
    let userEvaluations: any[] = [];

    if (req.user) {
      userSettings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
      const rawEvs = await prisma.userEvaluation.findMany({
        where: { userId: req.user.id, candidateId: id },
      });
      userEvaluations = rawEvs.filter(
        (ev) => !(ev.itemType === 'ANNOTATION' && (ev.itemId === 'new' || !ev.itemId))
      );
    } else if (req.headers['x-guest-settings']) {
      try {
        const guestData = JSON.parse(req.headers['x-guest-settings'] as string);
        if (guestData && typeof guestData === 'object') {
          userSettings = guestData;
        }
      } catch (e) {}
    }

    const score = calculateCandidateScore(
      userSettings,
      userEvaluations,
      candidate.careerItems,
      candidate
    );

    return res.json({
      ...candidate,
      userEvaluations,
      score,
    });
  } catch (error) {
    console.error('Error fetching candidate detail:', error);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do candidato.' });
  }
});

export default router;
