import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /admin/api/candidates - Fetch paginated list of candidates with search and filters
router.get('/', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '50', 10);
    const search = ((req.query.search as string) || '').trim();
    const party = ((req.query.party as string) || '').trim();
    const state = ((req.query.state as string) || '').trim();
    const cargo = ((req.query.cargo as string) || '').trim();

    const skip = (page - 1) * limit;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { popularName: { contains: search, mode: 'insensitive' } },
        { party: { contains: search, mode: 'insensitive' } },
        { cpf: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (party) {
      where.party = { equals: party, mode: 'insensitive' };
    }

    if (state) {
      where.state = { equals: state, mode: 'insensitive' };
    }

    if (cargo) {
      where.cargo = { equals: cargo, mode: 'insensitive' };
    }

    const [candidates, total] = await Promise.all([
      prisma.candidate.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          popularName: true,
          party: true,
          state: true,
          cargo: true,
          status: true,
          photoUrl: true,
          netWorth: true,
          wikipediaUrl: true,
          wikipediaSummary: true,
          wikipediaChecked: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.candidate.count({ where }),
    ]);

    return res.json({
      candidates,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error fetching candidates for admin:', err);
    return res.status(500).json({ error: 'Erro ao carregar lista de candidatos.', details: err.message });
  }
});

// GET /admin/api/candidates/:id - Get full details of a single candidate
router.get('/:id', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const candidate = await prisma.candidate.findUnique({
      where: { id },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    return res.json({ candidate });
  } catch (err: any) {
    console.error('Error fetching candidate by ID:', err);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do candidato.', details: err.message });
  }
});

// PUT /admin/api/candidates/:id - Edit a single candidate (No bulk edit)
router.put('/:id', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      name,
      popularName,
      party,
      state,
      cargo,
      status,
      summary,
      biography,
      wikipediaUrl,
      wikipediaSummary,
      wikipediaChecked,
      netWorth,
      education,
      occupation,
    } = req.body;

    const existing = await prisma.candidate.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Candidato não encontrado.' });
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(popularName !== undefined && { popularName }),
        ...(party !== undefined && { party }),
        ...(state !== undefined && { state }),
        ...(cargo !== undefined && { cargo }),
        ...(status !== undefined && { status }),
        ...(summary !== undefined && { summary }),
        ...(biography !== undefined && { biography }),
        ...(wikipediaUrl !== undefined && { wikipediaUrl }),
        ...(wikipediaSummary !== undefined && { wikipediaSummary }),
        ...(wikipediaChecked !== undefined ? { wikipediaChecked } : { wikipediaChecked: Boolean(wikipediaSummary) }),
        ...(netWorth !== undefined && { netWorth: typeof netWorth === 'number' ? netWorth : parseFloat(netWorth) || 0 }),
        ...(education !== undefined && { education }),
        ...(occupation !== undefined && { occupation }),
      },
    });

    return res.json({
      success: true,
      candidate: updated,
      message: `Candidato ${updated.name} atualizado com sucesso.`,
    });
  } catch (err: any) {
    console.error('Error updating candidate:', err);
    return res.status(500).json({ error: 'Erro ao atualizar candidato.', details: err.message });
  }
});

// POST /admin/api/candidates/bulk-clear - Bulk Action: Clear/reset selected candidates
router.post('/bulk-clear', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { candidateIds } = req.body;

    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'Nenhum candidato foi selecionado para a ação de limpar.' });
    }

    // Perform bulk clear: reset wikipedia info, custom summaries, and clean candidate evaluations/annotations
    const [updatedCount] = await Promise.all([
      prisma.candidate.updateMany({
        where: { id: { in: candidateIds } },
        data: {
          wikipediaSummary: null,
          wikipediaUrl: null,
          wikipediaChecked: false,
          summary: '',
          biography: null,
        },
      }),
      // Clean candidate annotations for these candidates
      prisma.candidateAnnotation.deleteMany({
        where: { candidateId: { in: candidateIds } },
      }),
      // Clean user evaluations for these candidates
      prisma.userEvaluation.deleteMany({
        where: { candidateId: { in: candidateIds } },
      }),
    ]);

    return res.json({
      success: true,
      clearedCount: updatedCount.count,
      message: `${updatedCount.count} candidato(s) limpo(s) com sucesso.`,
    });
  } catch (err: any) {
    console.error('Error bulk clearing candidates:', err);
    return res.status(500).json({ error: 'Erro ao executar a ação em lote para limpar candidatos.', details: err.message });
  }
});

export default router;
