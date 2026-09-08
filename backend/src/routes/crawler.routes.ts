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

router.get('/bls', (req, res) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const DATA_DIR = path.join(__dirname, '../../data');
    const JSON_PATH = path.join(DATA_DIR, 'bls_ideology.json');
    
    if (!fs.existsSync(JSON_PATH)) {
      return res.status(404).json({ error: 'BLS data not found' });
    }
    
    const data = fs.readFileSync(JSON_PATH, 'utf-8');
    return res.json(JSON.parse(data));
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to load BLS data' });
  }
});

export default router;
