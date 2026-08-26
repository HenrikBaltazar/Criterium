import { Router } from 'express';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

router.get('/status', async (req, res) => {
  try {
    const crawlerStatus = await prisma.crawlerStatus.findUnique({
      where: { id: 'default' },
    });

    if (!crawlerStatus || !crawlerStatus.lastHeartbeat) {
      return res.json({
        status: 'desativado',
        lastHeartbeat: null,
        candidatesFetched: 0,
      });
    }

    const now = new Date();
    const diffSeconds = (now.getTime() - new Date(crawlerStatus.lastHeartbeat).getTime()) / 1000;

    if (diffSeconds > 15) {
      return res.json({
        status: 'desativado',
        lastHeartbeat: crawlerStatus.lastHeartbeat,
        candidatesFetched: crawlerStatus.candidatesFetched,
      });
    }

    return res.json({
      status: crawlerStatus.status || 'ativo',
      lastHeartbeat: crawlerStatus.lastHeartbeat,
      candidatesFetched: crawlerStatus.candidatesFetched,
    });
  } catch (err: any) {
    return res.json({
      status: 'desativado',
      lastHeartbeat: null,
      candidatesFetched: 0,
    });
  }
});

export default router;
