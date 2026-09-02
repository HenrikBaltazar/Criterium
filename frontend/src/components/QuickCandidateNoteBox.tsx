import React, { useState, useEffect, useRef } from 'react';
import { CandidateAnnotation } from '../types';
import { saveCandidateAnnotation, updateCandidateAnnotation, deleteCandidateAnnotation } from '../services/api';
import { FileText, Check } from 'lucide-react';

interface QuickCandidateNoteBoxProps {
  candidateId: string;
  annotations: CandidateAnnotation[];
  onSave?: () => void;
}

export const QuickCandidateNoteBox: React.FC<QuickCandidateNoteBoxProps> = ({
  candidateId,
  annotations,
  onSave,
}) => {
  const existingQuickNoteAnn = annotations.find(
    (a) => a.title === 'Anotação Rápida' || a.title === 'Anotação rápida'
  );

  const [text, setText] = useState<string>('');
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (existingQuickNoteAnn) {
      setText(existingQuickNoteAnn.description || '');
    } else {
      const localValue = localStorage.getItem(`criterium_quick_note_${candidateId}`);
      if (localValue) {
        setText(localValue);
      } else {
        setText('');
      }
    }
  }, [candidateId, existingQuickNoteAnn]);

  const saveNote = async (newText: string) => {
    localStorage.setItem(`criterium_quick_note_${candidateId}`, newText);

    const token = localStorage.getItem('criterium_token');
    if (!token) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      return;
    }

    try {
      if (existingQuickNoteAnn) {
        if (newText.trim() === '') {
          await deleteCandidateAnnotation(existingQuickNoteAnn.id, candidateId);
        } else if (newText !== existingQuickNoteAnn.description) {
          await updateCandidateAnnotation(existingQuickNoteAnn.id, {
            candidateId,
            title: 'Anotação Rápida',
            description: newText,
            rating: 0,
          });
        }
      } else if (newText.trim() !== '') {
        await saveCandidateAnnotation({
          candidateId,
          title: 'Anotação Rápida',
          description: newText,
          rating: 0,
        });
      }
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
      if (onSave) onSave();
    } catch (err) {
      console.error('Erro ao salvar anotação rápida:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      saveNote(val);
    }, 800);
  };

  const handleBlur = () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    saveNote(text);
  };

  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        padding: '14px 18px',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        marginBottom: '16px',
        position: 'relative',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <FileText size={18} style={{ color: 'var(--text-muted)', marginTop: '4px', flexShrink: 0 }} />
        <textarea
          value={text}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder="Pagina wikipedia nao encontrada, adicione as informacoes do candidato..."
          rows={2}
          style={{
            width: '100%',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: 'var(--text-main)',
            fontSize: '0.88rem',
            lineHeight: '1.55',
            resize: 'vertical',
            fontFamily: 'inherit',
            minHeight: '46px',
          }}
        />
        {savedSuccess && (
          <span
            style={{
              position: 'absolute',
              right: '4px',
              bottom: '-8px',
              fontSize: '0.75rem',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600,
            }}
          >
            <Check size={12} /> Salvo
          </span>
        )}
      </div>
    </div>
  );
};
