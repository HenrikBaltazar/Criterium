import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// GET /api/macro/:key
router.get('/:key', async (req: Request, res: Response) => {
  const { key } = req.params;
  try {
    const indicator = await prisma.macroIndicator.findUnique({
      where: { key }
    });

    if (!indicator) {
      return res.status(404).json({ error: 'Macro indicator not found' });
    }

    // Parse the value since we store it as stringified JSON
    const data = JSON.parse(indicator.value);
    res.json(data);
  } catch (error) {
    console.error(`Error fetching macro indicator ${key}:`, error);
    res.status(500).json({ error: 'Failed to fetch macro indicator' });
  }
});

export const macroRoutes = router;
