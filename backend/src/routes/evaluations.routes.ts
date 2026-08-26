import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { EvaluationItemType } from '@prisma/client';

const router = Router();

const EvaluationSchema = z.object({
  candidateId: z.string().uuid(),
  itemType: z.nativeEnum(EvaluationItemType),
  itemId: z.string().optional().nullable(),
  rating: z.number().int().min(-999).max(999),
  comment: z.string().optional().nullable(),
});

router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

    const data = EvaluationSchema.parse(req.body);

    const evaluation = await prisma.userEvaluation.upsert({
      where: {
        userId_candidateId_itemType_itemId: {
          userId: req.user.id,
          candidateId: data.candidateId,
          itemType: data.itemType,
          itemId: data.itemId || '',
        },
      },
      update: {
        rating: data.rating,
        comment: data.comment,
      },
      create: {
        userId: req.user.id,
        candidateId: data.candidateId,
        itemType: data.itemType,
        itemId: data.itemId || '',
        rating: data.rating,
        comment: data.comment,
      },
    });

    return res.json(evaluation);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    console.error('Error saving evaluation:', err);
    return res.status(500).json({ error: 'Erro ao salvar avaliação.' });
  }
});

router.delete('/candidate/:candidateId', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
    const { candidateId } = req.params;

    await prisma.userEvaluation.deleteMany({
      where: {
        userId: req.user.id,
        candidateId,
      },
    });

    await prisma.candidateAnnotation.updateMany({
      where: {
        userId: req.user.id,
        candidateId,
      },
      data: {
        rating: 0,
      },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error('Error resetting candidate evaluations:', error);
    return res.status(500).json({ error: 'Erro ao zerar pontuações do candidato.' });
  }
});

router.delete('/user/all', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

    await prisma.userEvaluation.deleteMany({
      where: {
        userId: req.user.id,
      },
    });

    return res.json({ success: true, message: 'Todas as pontuações do usuário foram resetadas.' });
  } catch (error) {
    console.error('Error resetting all user evaluations:', error);
    return res.status(500).json({ error: 'Erro ao zerar todas as pontuações do usuário.' });
  }
});

router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });
    const { id } = req.params;

    await prisma.userEvaluation.deleteMany({
      where: { id, userId: req.user.id },
    });

    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao remover avaliação.' });
  }
});

export default router;
