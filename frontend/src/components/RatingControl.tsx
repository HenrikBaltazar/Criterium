import React, { useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { submitEvaluation } from '../services/api';
import { useApp } from '../context/AppContext';
import { UserEvaluation } from '../types';

interface RatingControlProps {
  candidateId: string;
  itemType: UserEvaluation['itemType'];
  itemId?: string;
  currentRating?: number;
  onRatingChanged?: () => void;
  onChangeScore?: (newRating: number) => void;
  onRequireAuth?: () => void;
}

export const RatingControl: React.FC<RatingControlProps> = ({
  candidateId,
  itemType,
  itemId,
  currentRating = 0,
  onRatingChanged,
  onChangeScore,
  onRequireAuth,
}) => {
  const { user } = useApp();
  const [rating, setRating] = useState<number>(currentRating);
  const [submitting, setSubmitting] = useState<boolean>(false);

  React.useEffect(() => {
    setRating(currentRating);
  }, [currentRating]);

  const handleAdjustRating = async (delta: number) => {
    if (!user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    const newRating = Math.min(999, Math.max(-999, rating + delta));
    if (newRating === rating) return;

    setRating(newRating);
    if (onChangeScore) {
      onChangeScore(newRating);
      return;
    }

    if (!itemId || itemId === 'new') {
      return;
    }

    setSubmitting(true);
    try {
      await submitEvaluation({
        candidateId,
        itemType,
        itemId,
        rating: newRating,
      });
      if (onRatingChanged) onRatingChanged();
    } catch (err) {
      console.error('Erro ao salvar nota:', err);
      setRating(rating); // Revert on failure
    } finally {
      setSubmitting(false);
    }
  };

  const isPositive = rating > 0;
  const isNegative = rating < 0;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      {/* Minus Button */}
      <button
        onClick={() => handleAdjustRating(-1)}
        disabled={submitting || rating <= -999}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: submitting || rating <= -999 ? 'not-allowed' : 'pointer',
          opacity: submitting || rating <= -999 ? 0.5 : 1,
          transition: 'var(--transition)',
        }}
        title="Reduzir pontuação (-1 ponto)"
      >
        <Minus size={14} className="desktop-icon-allow" />
      </button>

      {/* Center Score Badge */}
      <div
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-tertiary)',
          border: '1px solid ' + (isPositive || isNegative ? 'var(--border-strong)' : 'var(--border-subtle)'),
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          minWidth: '90px',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
        }}
      >
        {rating > 0 ? `+${rating}` : rating} pts
      </div>

      {/* Plus Button */}
      <button
        onClick={() => handleAdjustRating(1)}
        disabled={submitting || rating >= 999}
        style={{
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: submitting || rating >= 999 ? 'not-allowed' : 'pointer',
          opacity: submitting || rating >= 999 ? 0.5 : 1,
          transition: 'var(--transition)',
        }}
        title="Aumentar pontuação (+1 ponto)"
      >
        <Plus size={14} className="desktop-icon-allow" />
      </button>
    </div>
  );
};
