import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/db';
import { generateToken, authMiddleware, AuthenticatedRequest } from '../middlewares/auth';
import { sendWelcomeEmail } from '../services/emailService';

const router = Router();

const RegisterSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  name: z.string().min(2, 'Nome é obrigatório'),
});

const LoginSchema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha é obrigatória'),
});

router.post('/register', async (req, res) => {
  try {
    const data = RegisterSchema.parse(req.body);
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      return res.status(400).json({ error: 'Já existe uma conta com este e-mail.' });
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        passwordHash,
        settings: {
          create: {
            presetName: 'CUSTOM',
            autoRulesJson: '[]',
          },
        },
      },
      include: {
        settings: true,
      },
    });

    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });

    // Send welcome email asynchronously without blocking registration response
    sendWelcomeEmail({ to: user.email, name: user.name }).catch((err) => {
      console.error('[Auth] Falha no disparo em segundo plano do e-mail de boas-vindas:', err);
    });

    return res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
      settings: user.settings,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao criar conta.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const data = LoginSchema.parse(req.body);
    const user = await prisma.user.findUnique({
      where: { email: data.email },
      include: { settings: true },
    });

    if (!user) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const isValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Credenciais inválidas.' });
    }

    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role });

    return res.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      token,
      settings: user.settings,
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    return res.status(500).json({ error: 'Erro ao fazer login.' });
  }
});

router.get('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        settings: true,
      },
    });

    if (!user) return res.status(404).json({ error: 'Usuário não encontrado.' });

    return res.json({ user });
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar perfil.' });
  }
});

router.delete('/me', authMiddleware, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) return res.status(401).json({ error: 'Não autorizado.' });

    const userId = req.user.id;

    // 1. Delete all user evaluations
    await prisma.userEvaluation.deleteMany({
      where: { userId },
    });

    // 2. Delete user settings
    await prisma.userSettings.deleteMany({
      where: { userId },
    });

    // 3. Delete user account
    await prisma.user.delete({
      where: { id: userId },
    });

    return res.json({ message: 'Conta e todos os dados foram permanentemente excluídos.' });
  } catch (error) {
    console.error('Error deleting user account:', error);
    return res.status(500).json({ error: 'Erro ao excluir conta.' });
  }
});

export default router;
