import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { requireAdminAuth, AdminAuthRequest } from '../middleware/auth.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'criterium_jwt_secret_key_cloud_ready_2026';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin_secure_key_2026';

router.post('/login', (req: Request, res: Response) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ error: 'Informe a senha de administrador.' });
  }

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Senha de administrador incorreta.' });
  }

  const token = jwt.sign(
    {
      role: 'ADMIN',
      isAdmin: true,
      service: 'criterium_admin_service',
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );

  return res.json({
    success: true,
    token,
    message: 'Autenticação administrativa realizada com sucesso.',
  });
});

router.get('/me', requireAdminAuth, (req: AdminAuthRequest, res: Response) => {
  return res.json({
    authenticated: true,
    role: 'ADMIN',
    isAdmin: true,
    service: 'criterium_admin_service',
  });
});

export default router;
