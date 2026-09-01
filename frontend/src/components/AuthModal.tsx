import React, { useState, useEffect } from 'react';
import { X, Lock, Mail, User as UserIcon, CheckCircle2 } from 'lucide-react';
import { loginUser, registerUser } from '../services/api';
import { useApp } from '../context/AppContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'login' | 'register';
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, initialMode = 'login' }) => {
  const { login } = useApp();
  const [isLogin, setIsLogin] = useState<boolean>(initialMode === 'login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setIsLogin(initialMode === 'login');
      setError(null);
    }
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isLogin) {
        const res = await loginUser(email, password);
        login(res.token, res.user);
      } else {
        const res = await registerUser(email, password, name);
        login(res.token, res.user);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao processar requisição');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2000,
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        cursor: 'pointer',
      }}
    >
      <div
        className="glass-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '440px',
          padding: '28px',
          position: 'relative',
          cursor: 'default',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-strong)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.6)',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Fechar modal de login"
          title="Fechar"
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            color: 'var(--text-main)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'var(--transition)',
          }}
        >
          <X size={18} className="desktop-icon-allow" />
        </button>

        {/* Large Bold Callout Header for Register Mode */}
        {!isLogin && (
          <div
            style={{
              fontSize: '1.5rem',
              fontWeight: 900,
              letterSpacing: '-0.02em',
              color: 'var(--text-main)',
              marginBottom: '4px',
              textTransform: 'uppercase',
              lineHeight: 1.1,
            }}
          >
            É GRÁTIS!
          </div>
        )}

        <h2 style={{ fontSize: '1.35rem', marginBottom: '8px', color: 'var(--text-main)', fontWeight: 800 }}>
          {isLogin ? 'Entrar no Criterium' : 'Criar Conta no Criterium'}
        </h2>
        <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.45 }}>
          {isLogin
            ? 'Acesse suas regras personalizadas e sincronize suas avaliações.'
            : 'Crie sua conta gratuitamente para analisar os candidatos, pontua-los e criar seu próprio ranking baseado no que é importante para você!'}
        </p>

        {error && (
          <div
            style={{
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-main)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.82rem',
              fontWeight: 600,
              marginBottom: '16px',
            }}
          >
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {!isLogin && (
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                Nome Completo
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <UserIcon size={16} color="var(--text-muted)" className="desktop-icon-allow" style={{ position: 'absolute', left: '12px' }} />
                <input
                  type="text"
                  required
                  placeholder="Seu nome completo"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px 10px 36px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-tertiary)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              E-mail
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Mail size={16} color="var(--text-muted)" className="desktop-icon-allow" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="email"
                required
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-main)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
              Senha
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={16} color="var(--text-muted)" className="desktop-icon-allow" style={{ position: 'absolute', left: '12px' }} />
              <input
                type="password"
                required
                placeholder="Sua senha secreta"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 36px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: '6px',
              padding: '12px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--text-main)',
              color: 'var(--bg-primary)',
              fontWeight: 800,
              fontSize: '0.9rem',
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1,
              transition: 'var(--transition)',
            }}
          >
            {loading ? 'Aguarde...' : isLogin ? 'Entrar' : 'Cadastrar Gratuitamente'}
          </button>
        </form>

        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.84rem', color: 'var(--text-muted)' }}>
          {isLogin ? (
            <>
              Ainda não tem uma conta?{' '}
              <button
                onClick={() => {
                  setIsLogin(false);
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Cadastre-se grátis
              </button>
            </>
          ) : (
            <>
              Já possui uma conta?{' '}
              <button
                onClick={() => {
                  setIsLogin(true);
                  setError(null);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textDecoration: 'underline',
                }}
              >
                Faça login
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
