import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db';
import { authMiddleware, optionalAuthMiddleware, AuthenticatedRequest } from '../middlewares/auth';

const router = Router();

const UpdateSettingsSchema = z.object({
  presetName: z.string().optional(),
  autoRulesJson: z.string().optional(),
  selectedState: z.string().optional(),
});

router.get('/', optionalAuthMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.json({
        presetName: 'CUSTOM',
        autoRulesJson: '[]',
        selectedState: 'ALL',
        isGuest: true,
      });
    }

    let settings = await prisma.userSettings.findUnique({
      where: { userId: req.user.id },
    });

    if (!settings) {
      settings = await prisma.userSettings.create({
        data: {
          userId: req.user.id,
          presetName: 'CUSTOM',
          autoRulesJson: '[]',
          selectedState: 'ALL',
        },
      });
    }

    return res.json({
      ...settings,
      autoRulesJson: settings.autoRulesJson || '[]',
      selectedState: settings.selectedState || 'ALL',
      isGuest: false,
    });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar configurações.' });
  }
});

router.put('/', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

    const data = UpdateSettingsSchema.parse(req.body);

    const updatePayload: any = {};
    if (data.presetName !== undefined) updatePayload.presetName = data.presetName;
    if (data.autoRulesJson !== undefined) updatePayload.autoRulesJson = data.autoRulesJson;
    if (data.selectedState !== undefined) updatePayload.selectedState = data.selectedState;

    const settings = await prisma.userSettings.upsert({
      where: { userId: req.user.id },
      update: updatePayload,
      create: {
        userId: req.user.id,
        presetName: data.presetName || 'CUSTOM',
        autoRulesJson: data.autoRulesJson ?? '[]',
        selectedState: data.selectedState ?? 'ALL',
      },
    });

    return res.json(settings);
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao salvar configurações.' });
  }
});

export default router;
