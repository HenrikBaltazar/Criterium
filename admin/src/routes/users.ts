import { Router, Response } from 'express';
import { PrismaClient, Role } from '@prisma/client';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();
const prisma = new PrismaClient();

// GET /admin/api/users - List users
router.get('/', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const query = (req.query.q as string) || '';
    const page = parseInt((req.query.page as string) || '1', 10);
    const limit = parseInt((req.query.limit as string) || '20', 10);
    const skip = (page - 1) * limit;

    const where: any = query.trim()
      ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
            { id: { contains: query, mode: 'insensitive' } },
          ],
        }
      : {};

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              evaluations: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return res.json({
      users: users.map((u) => ({
        id: u.id,
        email: u.email,
        name: u.name,
        role: u.role,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
        evaluationsCount: u._count.evaluations,
      })),
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err: any) {
    console.error('Error fetching users:', err);
    return res.status(500).json({ error: 'Erro ao buscar lista de usuários.', details: err.message });
  }
});

// GET /admin/api/users/:id - User details
router.get('/:id', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        settings: true,
        evaluations: {
          take: 50,
          orderBy: { updatedAt: 'desc' },
          include: {
            candidate: {
              select: { name: true, party: true, popularName: true },
            },
          },
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.json({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      settings: user.settings,
      evaluationsCount: user.evaluations.length,
      evaluations: user.evaluations,
    });
  } catch (err: any) {
    console.error('Error fetching user detail:', err);
    return res.status(500).json({ error: 'Erro ao buscar detalhes do usuário.', details: err.message });
  }
});

// DELETE /admin/api/users/:id - Delete user cleanly
router.delete('/:id', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado para remoção.' });
    }

    // Transaction to safely drop user and all associated records
    await prisma.$transaction([
      prisma.userSettings.deleteMany({ where: { userId: id } }),
      prisma.userEvaluation.deleteMany({ where: { userId: id } }),
      prisma.candidateAnnotation.deleteMany({ where: { userId: id } }),
      prisma.user.delete({ where: { id } }),
    ]);

    return res.json({
      success: true,
      message: `Usuário '${user.name}' (${user.email}) excluído com sucesso do banco de dados.`,
    });
  } catch (err: any) {
    console.error('Error deleting user:', err);
    return res.status(500).json({ error: 'Erro ao deletar usuário.', details: err.message });
  }
});

// PUT /admin/api/users/:id/role - Toggle user role
router.put('/:id/role', requireAdminAuth, async (req: AdminAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || (role !== 'ADMIN' && role !== 'USER')) {
      return res.status(400).json({ error: 'Papel (role) inválido. Escolha ADMIN ou USER.' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role: role as Role },
      select: { id: true, name: true, email: true, role: true },
    });

    return res.json({
      success: true,
      user: updatedUser,
      message: `Papel do usuário '${updatedUser.name}' alterado para ${updatedUser.role}.`,
    });
  } catch (err: any) {
    console.error('Error updating user role:', err);
    return res.status(500).json({ error: 'Erro ao alterar papel do usuário.', details: err.message });
  }
});

export default router;
