import { Router } from 'express';
import { prisma } from '../config/db';

const router = Router();

router.get('/elections', async (_req, res) => {
  try {
    const elections = await prisma.electionYear.findMany({
      orderBy: { year: 'desc' },
    });
    return res.json(elections);
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar anos de eleição.' });
  }
});

router.get('/cargos', async (_req, res) => {
  try {
    const cargos = await prisma.cargo.findMany({
      orderBy: { name: 'asc' },
    });

    const seen = new Map<string, any>();
    for (const c of cargos) {
      const canonicalCode = c.code === 'DEPUTADO_FEDERAL' ? 'DEP_FEDERAL' : c.code === 'DEPUTADO_ESTADUAL' ? 'DEP_ESTADUAL' : c.code;
      if (!seen.has(canonicalCode)) {
        seen.set(canonicalCode, { ...c, code: canonicalCode });
      }
    }

    return res.json(Array.from(seen.values()));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar cargos.' });
  }
});

export default router;
