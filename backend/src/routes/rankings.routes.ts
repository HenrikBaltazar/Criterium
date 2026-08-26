import { Router, Response } from 'express';
import { prisma } from '../config/db';
import { optionalAuthMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { calculateCandidateScore } from '../services/scoreCalculator';

const router = Router();

router.get('/', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { year, cargoCode, state } = req.query;

    const selectedYear = year ? parseInt(year as string) : 2026;
    const selectedCargo = cargoCode ? (cargoCode as string) : 'PRESIDENTE';

    let userSettings = null;
    let userEvaluationsMap: Record<string, any[]> = {};

    if (req.user) {
      userSettings = await prisma.userSettings.findUnique({ where: { userId: req.user.id } });
      const evs = await prisma.userEvaluation.findMany({ where: { userId: req.user.id } });
      for (const ev of evs) {
        if (ev.itemType === 'ANNOTATION' && (ev.itemId === 'new' || !ev.itemId)) continue;
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

    const where: any = {
      electionYear: { year: selectedYear },
      cargo: { code: selectedCargo },
    };

    // PRESIDENTE cargo is nationwide/federal and must be visible regardless of selected state
    if (state && state !== 'ALL' && selectedCargo !== 'PRESIDENTE') {
      where.state = state as string;
    }

    const candidates = await prisma.candidate.findMany({
      where,
      include: {
        electionYear: true,
        cargo: true,
        careerItems: true,
      },
    });

    const ranked = candidates.map((cand: any) => {
      const candidateEvs = userEvaluationsMap[cand.id] || [];
      const score = calculateCandidateScore(userSettings, candidateEvs, cand.careerItems, cand);
      return {
        id: cand.id,
        name: cand.name,
        popularName: cand.popularName,
        party: cand.party,
        partyNumber: cand.partyNumber,
        candidateNumber: cand.candidateNumber,
        state: cand.state,
        city: cand.city,
        photoUrl: cand.photoUrl,
        summary: cand.summary,
        status: cand.status,
        cargo: cand.cargo,
        electionYear: cand.electionYear,
        userEvaluations: candidateEvs,
        score,
      };
    });

    // Rank candidates by composite score (highest first)
    ranked.sort((a: any, b: any) => b.score.totalCompositeScore - a.score.totalCompositeScore);

    // Add rank position (1-indexed)
    const leaderboard = ranked.map((cand: any, index: number) => ({
      rank: index + 1,
      ...cand,
    }));

    return res.json({
      electionYear: selectedYear,
      cargoCode: selectedCargo,
      totalCandidates: leaderboard.length,
      leaderboard,
    });
  } catch (error) {
    console.error('Error fetching rankings:', error);
    return res.status(500).json({ error: 'Erro ao gerar ranking de candidatos.' });
  }
});

export default router;
