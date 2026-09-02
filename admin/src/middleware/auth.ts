import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AdminAuthRequest extends Request {
  adminPayload?: {
    role: string;
    isAdmin: boolean;
    iat?: number;
    exp?: number;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'criterium_jwt_secret_key_cloud_ready_2026';

export const requireAdminAuth = (req: AdminAuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acesso negado. Token administrativo não fornecido.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (!decoded || !decoded.isAdmin) {
      return res.status(403).json({ error: 'Permissão negada. Token inválido para acesso admin.' });
    }
    req.adminPayload = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão administrativa expirada ou inválida.' });
  }
};
