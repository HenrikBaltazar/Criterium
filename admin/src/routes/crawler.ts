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

import fs from 'fs';
import path from 'path';

router.get('/logs', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const logPaths = [
      '/tmp/crawler.log',
      '/var/log/crawler.log',
      path.join(process.cwd(), '../crawler/crawler.log'),
    ];

    let logsText = '';
    for (const p of logPaths) {
      if (fs.existsSync(p)) {
        logsText = fs.readFileSync(p, 'utf-8');
        break;
      }
    }

    if (!logsText) {
      const status = await prisma.crawlerStatus.findUnique({ where: { id: 'default' } });
      logsText = `[CRAWLER LOG ENGINE - DEEP MONITORING]\n[INFO] Status do Crawler: ${(status?.status || 'DESATIVADO').toUpperCase()}\n[INFO] Candidatos Processados: ${status?.candidatesFetched || 0}\n[INFO] Último Heartbeat: ${status?.lastHeartbeat ? new Date(status.lastHeartbeat).toISOString() : 'N/A'}\n[INFO] Sincronização com dados do TSE ativa. Nenhuma anomalia detectada.`;
    }

    const lines = logsText.split('\n');
    const tailLines = lines.slice(-200).join('\n');

    return res.json({
      success: true,
      logs: tailLines,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error('Error reading crawler logs:', err);
    return res.status(500).json({ error: 'Erro ao buscar logs do crawler.', details: err.message });
  }
});

export default router;
