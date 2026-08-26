import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

const AnnotationSchema = z.object({
  candidateId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  sourceUrl: z.string().optional().nullable(),
  rating: z.number().default(0),
});

const UpdateAnnotationSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  sourceUrl: z.string().optional().nullable(),
  rating: z.number().optional(),
});

// GET /api/annotations/candidate/:candidateId (Optional Auth - Returns user's annotations)
router.get('/candidate/:candidateId', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { candidateId } = req.params;
    const userId = req.user?.id;

    if (!userId) {
      return res.json([]); // Guest users have 0 annotations from backend
    }

    const annotations = await prisma.candidateAnnotation.findMany({
      where: { candidateId, userId },
      orderBy: { createdAt: 'desc' },
    });

    res.json(annotations);
  } catch (error) {
    console.error('Error fetching annotations:', error);
    res.status(500).json({ error: 'Failed to fetch annotations' });
  }
});

// POST /api/annotations (Requires Auth)
router.post('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = AnnotationSchema.parse(req.body);
    const userId = req.user!.id;

    const annotation = await prisma.candidateAnnotation.create({
      data: {
        userId,
        candidateId: data.candidateId,
        title: data.title,
        description: data.description,
        sourceUrl: data.sourceUrl || null,
        rating: data.rating,
      },
    });

    // Clean up any orphan 'new' evaluation if created previously
    await prisma.userEvaluation.deleteMany({
      where: {
        userId,
        candidateId: data.candidateId,
        itemType: 'ANNOTATION',
        itemId: 'new',
      },
    });

    // Sync to UserEvaluation so score is automatically summed up!
    await prisma.userEvaluation.upsert({
      where: {
        userId_candidateId_itemType_itemId: {
          userId,
          candidateId: data.candidateId,
          itemType: 'ANNOTATION',
          itemId: annotation.id,
        },
      },
      update: {
        rating: data.rating,
        comment: data.title,
      },
      create: {
        userId,
        candidateId: data.candidateId,
        itemType: 'ANNOTATION',
        itemId: annotation.id,
        rating: data.rating,
        comment: data.title,
      },
    });

    res.json(annotation);
  } catch (error: any) {
    console.error('Error creating annotation:', error);
    res.status(400).json({ error: error.message || 'Failed to create annotation' });
  }
});

// PUT /api/annotations/:id (Requires Auth)
router.put('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const data = UpdateAnnotationSchema.parse(req.body);
    const userId = req.user!.id;

    const existing = await prisma.candidateAnnotation.findFirst({
      where: { id, userId },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Anotação não encontrada ou acesso negado' });
    }

    const updated = await prisma.candidateAnnotation.update({
      where: { id },
      data,
    });

    if (data.rating !== undefined) {
      await prisma.userEvaluation.upsert({
        where: {
          userId_candidateId_itemType_itemId: {
            userId,
            candidateId: updated.candidateId,
            itemType: 'ANNOTATION',
            itemId: updated.id,
          },
        },
        update: {
          rating: data.rating,
          comment: updated.title,
        },
        create: {
          userId,
          candidateId: updated.candidateId,
          itemType: 'ANNOTATION',
          itemId: updated.id,
          rating: data.rating,
          comment: updated.title,
        },
      });
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating annotation:', error);
    res.status(400).json({ error: error.message || 'Failed to update annotation' });
  }
});

// DELETE /api/annotations/:id (Requires Auth)
router.delete('/:id', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.candidateAnnotation.findFirst({
      where: { id, userId },
    });

    if (existing) {
      await prisma.candidateAnnotation.delete({ where: { id } });

      await prisma.userEvaluation.deleteMany({
        where: {
          userId,
          candidateId: existing.candidateId,
          itemType: 'ANNOTATION',
          itemId: existing.id,
        },
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting annotation:', error);
    res.status(400).json({ error: error.message || 'Failed to delete annotation' });
  }
});

export default router;
