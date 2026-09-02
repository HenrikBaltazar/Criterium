import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

router.get('/status', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const status = await prisma.crawlerStatus.findUnique({ where: { id: 'default' } });
    return res.json(
      status || {
        id: 'default',
        status: 'desativado',
        candidatesFetched: 0,
        lastHeartbeat: new Date(),
      }
    );
  } catch (err: any) {
    console.error('Error fetching crawler status:', err);
    return res.status(500).json({ error: 'Erro ao consultar status do crawler.', details: err.message });
  }
});

router.post('/toggle', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { status } = req.body;
    const newStatus = status === 'ativo' ? 'ativo' : 'desativado';

    const updated = await prisma.crawlerStatus.upsert({
      where: { id: 'default' },
      update: { status: newStatus, lastHeartbeat: new Date() },
      create: { id: 'default', status: newStatus, candidatesFetched: 0 },
    });

    return res.json({
      success: true,
      crawlerStatus: updated,
      message: `Status do crawler alterado para '${newStatus}'.`,
    });
  } catch (err: any) {
    console.error('Error toggling crawler status:', err);
    return res.status(500).json({ error: 'Erro ao alterar status do crawler.', details: err.message });
  }
});

export default router;
