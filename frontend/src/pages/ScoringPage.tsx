import React, { useState, useEffect, useRef } from 'react';
import { Award, Save, RotateCcw, ArrowLeft, Plus, Minus, X, Settings, Trash2, AlertOctagon, ChevronDown, GitCommit } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AutoScoreRule } from '../types';
import { deleteAllUserEvaluations } from '../services/api';

interface ScoringPageProps {
  onRequireAuth?: () => void;
  onGoToDashboard?: () => void;
}

const CARGO_OPTIONS = [
  'TODOS',
  'Presidente',
  'Governador',
  'Senador',
  'Deputado Federal',
  'Deputado Estadual'
];

const PARTY_OPTIONS = [
  'AGIR', 'AVANTE', 'CIDADANIA', 'DC', 'MDB', 'MOBILIZA', 'NOVO', 'PCdoB', 'PCO', 'PDT',
  'PL', 'PMB', 'PODE', 'PP', 'PRD', 'PRTB', 'PSB', 'PSD', 'PSDB', 'PSOL', 'PSTU', 'PT',
  'PV', 'REDE', 'REPUBLICANOS', 'SOLIDARIEDADE', 'UNIÃO', 'UP'
];

const EDUCATION_OPTIONS = [
  'Superior Completo',
  'Superior Incompleto',
  'Ensino Médio Completo',
  'Ensino Médio Incompleto',
  'Ensino Fundamental Completo',
  'Ensino Fundamental Incompleto',
  'Lê e Escreve'
];

const OCCUPATION_OPTIONS = [
  'Administrador',
  'Advogado',
  'Agrônomo',
  'Aposentado',
  'Arquiteto',
  'Assistente Social',
  'Atleta Profissional',
  'Ator e Diretor de Espectáculos',
  'Autônomo',
  'Auxiliar de Escritório',
  'Bancário',
  'Biólogo',
  'Bombeiro Militar',
  'Cabeleireiro e Barbeiro',
  'Comerciante',
  'Comerciário',
  'Contador',
  'Corretor de Imóveis, Seguros, Títulos e Valores',
  'Cozinheiro',
  'Deputado',
  'Despachante',
  'Empresário',
  'Enfermeiro',
  'Engenheiro',
  'Escritor e Poeta',
  'Estudante',
  'Farmacêutico',
  'Fisioterapeuta e Terapeuta Ocupacional',
  'Fotógrafo',
  'Garçom',
  'Governador',
  'Jornalista e Redator',
  'Locutor e Comentarista de Rádio e Televisão e Radialista',
  'Magistrado',
  'Mandatário Político',
  'Mecânico de Manutenção',
  'Médico',
  'Militar reformado',
  'Músico',
  'Nutricionista',
  'Odontólogo',
  'Padeiro e Confeiteiro',
  'Pescador',
  'Policial Civil',
  'Policial Militar',
  'Porteiro de Edifício, Ascensorista, Garagista e Zelador',
  'Prefeito',
  'Produtor Agropecuário',
  'Professor de Ensino Fundamental',
  'Professor de Ensino Médio',
  'Professor de Ensino Superior',
  'Psicólogo',
  'Publicitário',
  'Recepcionista',
  'Sacerdote ou Membro de Ordem ou Seita Religiosa',
  'Senador',
  'Servidor Público Civil',
  'Servidor Público Estadual',
  'Servidor Público Federal',
  'Servidor Público Municipal',
  'Taxista',
  'Técnico de Enfermagem',
  'Trabalhador Rural',
  'Vereador',
  'Veterinário',
  'Vigilante'
];

interface NumberStepControlProps {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
}

const NumberStepControl: React.FC<NumberStepControlProps> = ({
  value,
  onChange,
  min = -999,
  max = 999,
}) => {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
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
          cursor: value <= min ? 'not-allowed' : 'pointer',
          opacity: value <= min ? 0.5 : 1,
          transition: 'var(--transition)',
        }}
        title="Diminuir"
      >
        <Minus size={14} className="desktop-icon-allow" />
      </button>

      <div
        style={{
          padding: '4px 10px',
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'var(--text-main)',
          minWidth: '60px',
          textAlign: 'center',
        }}
      >
        {value > 0 ? `+${value}` : value} pts
      </div>

      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
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
          cursor: value >= max ? 'not-allowed' : 'pointer',
          opacity: value >= max ? 0.5 : 1,
          transition: 'var(--transition)',
        }}
        title="Aumentar"
      >
        <Plus size={14} className="desktop-icon-allow" />
      </button>
    </div>
  );
};

interface MultiSelectDropdownProps {
  selectedValues: string[];
  onChange: (values: string[]) => void;
  options: string[];
  placeholder: string;
  itemSingularName: string;
  itemPluralName: string;
  minWidth?: string;
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  selectedValues,
  onChange,
  options,
  placeholder,
  itemSingularName,
  itemPluralName,
  minWidth = '240px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleValue = (val: string) => {
    if (selectedValues.includes(val)) {
      onChange(selectedValues.filter((v) => v !== val));
    } else {
      onChange([...selectedValues, val]);
    }
  };

  const handleSelectAll = () => {
    if (selectedValues.length === options.length) {
      onChange([]);
    } else {
      onChange([...options]);
    }
  };

  const buttonLabel = (() => {
    if (selectedValues.length === 0) return placeholder;
    if (selectedValues.length === 1) return `1 ${itemSingularName} (${selectedValues[0]})`;
    if (selectedValues.length <= 3) return `${selectedValues.length} ${itemPluralName} (${selectedValues.join(', ')})`;
    return `${selectedValues.length} ${itemPluralName} selecionado(s)`;
  })();

  return (
    <div ref={dropdownRef} style={{ position: 'relative', display: 'inline-block', minWidth, zIndex: isOpen ? 1000 : 10 }}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '8px 12px',
          borderRadius: 'var(--radius-sm)',
          background: 'var(--bg-tertiary)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-main)',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '0.88rem',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{buttonLabel}</span>
        <ChevronDown size={16} color="var(--text-muted)" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            left: 0,
            zIndex: 100,
            width: '280px',
            maxHeight: '280px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 12px 28px rgba(0, 0, 0, 0.5)',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-subtle)', paddingBottom: '6px' }}>
            <button
              type="button"
              onClick={handleSelectAll}
              style={{ background: 'none', border: 'none', color: 'var(--text-main)', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {selectedValues.length === options.length ? 'Desmarcar Todos' : 'Marcar Todos'}
            </button>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{selectedValues.length} selecionado(s)</span>
          </div>

          <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', paddingRight: '4px' }}>
            {options.map((opt) => {
              const isChecked = selectedValues.includes(opt);
              return (
                <label
                  key={opt}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: 'var(--radius-sm)',
                    background: isChecked ? 'var(--bg-tertiary)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '0.84rem',
                    fontWeight: isChecked ? 700 : 500,
                    color: 'var(--text-main)',
                    userSelect: 'none',
                    transition: 'var(--transition)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleValue(opt)}
                    style={{ accentColor: 'var(--text-main)', cursor: 'pointer' }}
                  />
                  <span>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

function formatMultiItemRuleBadge(r: AutoScoreRule, componentType: 'PARTY' | 'EDUCATION' | 'OCCUPATION') {
  const cargoTag = `[${r.cargo || 'TODOS'}]`;
  const rawCat = r.categoryValue || '';
  const items = rawCat
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  let badgeText = '';
  let tooltipText = '';

  if (componentType === 'PARTY') {
    if (items.length > 1) {
      badgeText = `${cargoTag} ${items.length} partidos selecionados`;
      tooltipText = `Partidos: ${items.join(', ')}`;
    } else {
      badgeText = `${cargoTag} Partido ${items[0] || rawCat}`;
      tooltipText = `Partido: ${items[0] || rawCat}`;
    }
  } else if (componentType === 'EDUCATION') {
    if (items.length > 1) {
      badgeText = `${cargoTag} ${items.length} graus de instrução selecionados`;
      tooltipText = `Graus de instrução: ${items.join(', ')}`;
    } else {
      badgeText = `${cargoTag} Instrução ${items[0] || rawCat}`;
      tooltipText = `Instrução: ${items[0] || rawCat}`;
    }
  } else if (componentType === 'OCCUPATION') {
    if (items.length > 1) {
      badgeText = `${cargoTag} ${items.length} ocupações selecionadas`;
      tooltipText = `Ocupações: ${items.join(', ')}`;
    } else {
      badgeText = `${cargoTag} Ocupação ${items[0] || rawCat}`;
      tooltipText = `Ocupação: ${items[0] || rawCat}`;
    }
  }

  return { badgeText, tooltipText };
}

export const ScoringPage: React.FC<ScoringPageProps> = ({ onRequireAuth, onGoToDashboard }) => {
  const { settings, updateSettings, user } = useApp();
  const [rules, setRules] = useState<AutoScoreRule[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  // Form states with numeric step control & cargo filter
  const [selectedParties, setSelectedParties] = useState<string[]>([]);
  const [partyCargo, setPartyCargo] = useState('TODOS');
  const [partyPoints, setPartyPoints] = useState<number>(0);

  const [selectedEdu, setSelectedEdu] = useState<string[]>([]);
  const [eduCargo, setEduCargo] = useState('TODOS');
  const [eduPoints, setEduPoints] = useState<number>(0);

  const [assetMin, setAssetMin] = useState('');
  const [assetMax, setAssetMax] = useState('');
  const [assetCargo, setAssetCargo] = useState('TODOS');
  const [assetPoints, setAssetPoints] = useState<number>(0);

  const [selectedOcc, setSelectedOcc] = useState<string[]>([]);
  const [occCargo, setOccCargo] = useState('TODOS');
  const [occPoints, setOccPoints] = useState<number>(0);

  const [expSelect, setExpSelect] = useState('');
  const [expCargo, setExpCargo] = useState('TODOS');
  const [expPoints, setExpPoints] = useState<number>(0);

  const [perfMode, setPerfMode] = useState<'MIN' | 'MAX'>('MIN');
  const [perfValue, setPerfValue] = useState('85');
  const [perfCargo, setPerfCargo] = useState('TODOS');
  const [perfPoints, setPerfPoints] = useState<number>(0);

  const [partySwitchMin, setPartySwitchMin] = useState('1');
  const [partySwitchCargo, setPartySwitchCargo] = useState('TODOS');
  const [partySwitchPoints, setPartySwitchPoints] = useState<number>(0);

  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [isResetRulesModalOpen, setIsResetRulesModalOpen] = useState(false);
  const [isResetEvaluationsModalOpen, setIsResetEvaluationsModalOpen] = useState(false);
  const [isResettingEvaluations, setIsResettingEvaluations] = useState(false);
  const [resetEvaluationsSuccess, setResetEvaluationsSuccess] = useState(false);

  const handleConfirmResetAllEvaluations = async () => {
    setIsResettingEvaluations(true);
    try {
      await deleteAllUserEvaluations();
      window.dispatchEvent(new Event('criterium_rules_updated'));
      setIsResetEvaluationsModalOpen(false);
      setResetEvaluationsSuccess(true);
      setTimeout(() => setResetEvaluationsSuccess(false), 3000);
    } catch (err) {
      console.error('Erro ao resetar todas as pontuações:', err);
    } finally {
      setIsResettingEvaluations(false);
    }
  };

  useEffect(() => {
    if (settings?.autoRulesJson) {
      try {
        const parsed = JSON.parse(settings.autoRulesJson);
        if (Array.isArray(parsed)) {
          setRules(parsed);
        }
      } catch (e) {
        console.error('Erro ao ler autoRulesJson:', e);
      }
    }
  }, [settings]);

  const handleAddRule = (newRule: Omit<AutoScoreRule, 'id'>) => {
    if (!user && onRequireAuth) {
      onRequireAuth();
      return;
    }
    const ruleWithId: AutoScoreRule = {
      ...newRule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    };
    setRules((prev) => [...prev, ruleWithId]);
  };

  const handleDeleteRule = (id: string) => {
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const handleSave = async () => {
    if (!user && onRequireAuth) {
      onRequireAuth();
      return;
    }
    setIsApplying(true);
    await updateSettings({
      ...settings,
      autoRulesJson: JSON.stringify(rules),
    });
    window.dispatchEvent(new Event('criterium_rules_updated'));
    setIsApplying(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleResetClick = () => {
    if (!user && onRequireAuth) {
      onRequireAuth();
      return;
    }
    setIsResetRulesModalOpen(true);
  };

  const handleResetConfirm = async () => {
    setIsApplying(true);
    setRules([]);
    await updateSettings({
      ...settings,
      autoRulesJson: '[]',
    });
    window.dispatchEvent(new Event('criterium_rules_updated'));
    setIsApplying(false);
    setIsResetRulesModalOpen(false);
    setResetSuccess(true);
    setTimeout(() => setResetSuccess(false), 2500);
  };

  const getRulesByComponent = (comp: AutoScoreRule['component']) => rules.filter((r) => r.component === comp);

  const formatPoints = (pts: number) => (pts > 0 ? `+${pts} pts` : `${pts} pts`);

  return (
    <div className="container" style={{ padding: '24px 16px 80px 16px', maxWidth: '840px' }}>
      {/* Top Navigation Button */}
      {onGoToDashboard && (
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={onGoToDashboard}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-full)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'var(--transition)',
            }}
          >
            <ArrowLeft size={16} className="desktop-icon-allow" />
            <span>Voltar ao Painel</span>
          </button>
        </div>
      )}

      {/* Header Card */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <Award size={26} color="var(--text-main)" />
          <h2 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800 }}>Regras de Pontuação Automática</h2>
        </div>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
          Crie regras de pontuação automática direcionadas a todos os cargos ou cargos específicos (Presidente, Governador, Senador, etc.).
          Pontos gerados por estas regras serão destacados com o ícone de engrenagem (<Settings size={14} style={{ display: 'inline', verticalAlign: 'middle' }} />) no dossiê.
        </p>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '20px' }}>
          <button
            disabled={isApplying}
            onClick={handleSave}
            className="btn btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              opacity: isApplying ? 0.7 : 1,
            }}
          >
            <Save size={16} />
            <span>{isApplying ? 'Aplicando e Calculando Regras...' : 'Aplicar Regras de Pontuação'}</span>
          </button>

          <button
            disabled={isApplying}
            onClick={handleResetClick}
            className="btn btn-outline"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              opacity: isApplying ? 0.7 : 1,
            }}
          >
            <RotateCcw size={16} />
            <span>Resetar Regras Padrão</span>
          </button>
        </div>

        {savedSuccess && (
          <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
            ✓ Regras de pontuação automática salvas e aplicadas aos candidatos!
          </div>
        )}

        {resetSuccess && (
          <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700 }}>
            ✓ Todas as regras foram resetadas para o padrão.
          </div>
        )}
      </div>

      {/* Confirmation Modal for Resetting Rules */}
      {isResetRulesModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div className="glass-card" style={{ maxWidth: '440px', width: '100%', padding: '24px', textAlign: 'center' }}>
            <AlertOctagon size={42} color="var(--text-main)" style={{ marginBottom: '12px' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: '8px', color: 'var(--text-main)' }}>Confirmar Reset de Regras?</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '20px', lineHeight: 1.5 }}>
              Tem certeza que deseja remover todas as suas regras de pontuação automática e restaurar as configurações padrão? Esta ação não pode ser desfeita.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                type="button"
                onClick={() => setIsResetRulesModalOpen(false)}
                className="btn btn-outline"
                style={{ padding: '10px 18px', fontWeight: 700 }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleResetConfirm}
                className="btn"
                style={{ padding: '10px 18px', fontWeight: 700, background: 'var(--text-main)', color: 'var(--bg-primary)' }}
              >
                Sim, Resetar Regras
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Component Rules Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 1. Partido */}
        <div className="glass-card" style={{ padding: '20px', position: 'relative', zIndex: 50 }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', fontWeight: 700 }}>1. Partido Político</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <select
              value={partyCargo}
              onChange={(e) => setPartyCargo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              {CARGO_OPTIONS.map((c) => (
                <option key={c} value={c}>Cargo: {c}</option>
              ))}
            </select>
            <MultiSelectDropdown
              selectedValues={selectedParties}
              onChange={setSelectedParties}
              options={PARTY_OPTIONS}
              placeholder="Selecione os partidos..."
              itemSingularName="partido"
              itemPluralName="partidos"
            />
            <NumberStepControl value={partyPoints} onChange={setPartyPoints} />
            <button
              disabled={selectedParties.length === 0}
              onClick={() => {
                if (selectedParties.length === 0) return;
                handleAddRule({ component: 'PARTY', categoryValue: selectedParties.join(', '), cargo: partyCargo, points: partyPoints });
                setSelectedParties([]);
                setPartyCargo('TODOS');
                setPartyPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: selectedParties.length === 0 ? 0.5 : 1 }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('PARTY').map((r) => {
              const { badgeText, tooltipText } = formatMultiItemRuleBadge(r, 'PARTY');
              return (
                <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'help' }} title={tooltipText}>
                  <span>{badgeText}: <strong>{formatPoints(r.points)}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(r.id)}
                    title="Remover esta regra"
                    aria-label="Remover regra"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                  >
                    <X size={14} className="desktop-icon-allow" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* 2. Grau de Instrução */}
        <div className="glass-card" style={{ padding: '20px', position: 'relative', zIndex: 40 }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', fontWeight: 700 }}>2. Grau de Instrução</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <select
              value={eduCargo}
              onChange={(e) => setEduCargo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              {CARGO_OPTIONS.map((c) => (
                <option key={c} value={c}>Cargo: {c}</option>
              ))}
            </select>
            <MultiSelectDropdown
              selectedValues={selectedEdu}
              onChange={setSelectedEdu}
              options={EDUCATION_OPTIONS}
              placeholder="Selecione o grau de instrução..."
              itemSingularName="grau de instrução"
              itemPluralName="graus de instrução"
            />
            <NumberStepControl value={eduPoints} onChange={setEduPoints} />
            <button
              disabled={selectedEdu.length === 0}
              onClick={() => {
                if (selectedEdu.length === 0) return;
                handleAddRule({ component: 'EDUCATION', categoryValue: selectedEdu.join(', '), cargo: eduCargo, points: eduPoints });
                setSelectedEdu([]);
                setEduCargo('TODOS');
                setEduPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: selectedEdu.length === 0 ? 0.5 : 1 }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('EDUCATION').map((r) => {
              const { badgeText, tooltipText } = formatMultiItemRuleBadge(r, 'EDUCATION');
              return (
                <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'help' }} title={tooltipText}>
                  <span>{badgeText}: <strong>{formatPoints(r.points)}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(r.id)}
                    title="Remover esta regra"
                    aria-label="Remover regra"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                  >
                    <X size={14} className="desktop-icon-allow" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* 3. Patrimônio Declarado (Range) */}
        <div className="glass-card" style={{ padding: '20px', position: 'relative', zIndex: 35 }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', fontWeight: 700 }}>3. Patrimônio Declarado (Faixa R$)</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <select
              value={assetCargo}
              onChange={(e) => setAssetCargo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              {CARGO_OPTIONS.map((c) => (
                <option key={c} value={c}>Cargo: {c}</option>
              ))}
            </select>
            <input
              type="number"
              value={assetMin}
              onChange={(e) => setAssetMin(e.target.value)}
              style={{ width: '120px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
              placeholder="Mín R$"
            />
            <input
              type="number"
              value={assetMax}
              onChange={(e) => setAssetMax(e.target.value)}
              style={{ width: '120px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
              placeholder="Máx R$"
            />
            <NumberStepControl value={assetPoints} onChange={setAssetPoints} />
            <button
              onClick={() => {
                const min = assetMin !== '' ? parseInt(assetMin) : 0;
                const max = assetMax !== '' ? parseInt(assetMax) : 0;
                handleAddRule({ component: 'ASSETS', minValue: min, maxValue: max, cargo: assetCargo, points: assetPoints });
                setAssetMin('');
                setAssetMax('');
                setAssetCargo('TODOS');
                setAssetPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('ASSETS').map((r) => (
              <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>[{r.cargo || 'TODOS'}] R$ {r.minValue?.toLocaleString()} a {r.maxValue ? `R$ ${r.maxValue.toLocaleString()}` : 'Acima'}: <strong>{formatPoints(r.points)}</strong></span>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(r.id)}
                  title="Remover esta regra"
                  aria-label="Remover regra"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                >
                  <X size={14} className="desktop-icon-allow" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 4. Ocupação Declarada */}
        <div className="glass-card" style={{ padding: '20px', position: 'relative', zIndex: 30 }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', fontWeight: 700 }}>4. Ocupação Declarada</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <select
              value={occCargo}
              onChange={(e) => setOccCargo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              {CARGO_OPTIONS.map((c) => (
                <option key={c} value={c}>Cargo: {c}</option>
              ))}
            </select>
            <MultiSelectDropdown
              selectedValues={selectedOcc}
              onChange={setSelectedOcc}
              options={OCCUPATION_OPTIONS}
              placeholder="Selecione a ocupação..."
              itemSingularName="ocupação"
              itemPluralName="ocupações"
            />
            <NumberStepControl value={occPoints} onChange={setOccPoints} />
            <button
              disabled={selectedOcc.length === 0}
              onClick={() => {
                if (selectedOcc.length === 0) return;
                handleAddRule({ component: 'OCCUPATION', categoryValue: selectedOcc.join(', '), cargo: occCargo, points: occPoints });
                setSelectedOcc([]);
                setOccCargo('TODOS');
                setOccPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: selectedOcc.length === 0 ? 0.5 : 1 }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('OCCUPATION').map((r) => {
              const { badgeText, tooltipText } = formatMultiItemRuleBadge(r, 'OCCUPATION');
              return (
                <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'help' }} title={tooltipText}>
                  <span>{badgeText}: <strong>{formatPoints(r.points)}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(r.id)}
                    title="Remover esta regra"
                    aria-label="Remover regra"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                  >
                    <X size={14} className="desktop-icon-allow" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* 5. Etiqueta automática */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', fontWeight: 700 }}>5. Etiqueta automática</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <select
              value={expCargo}
              onChange={(e) => setExpCargo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              {CARGO_OPTIONS.map((c) => (
                <option key={c} value={c}>Cargo: {c}</option>
              ))}
            </select>
            <select
              value={expSelect}
              onChange={(e) => setExpSelect(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              <option value="">Selecione a experiência</option>
              <option value="OUTSIDER">Outsider (1ª Eleição)</option>
              <option value="EXPERIENTE">Experiente (Eleito em 1+ eleição passada)</option>
            </select>
            <NumberStepControl value={expPoints} onChange={setExpPoints} />
            <button
              disabled={!expSelect}
              onClick={() => {
                if (!expSelect) return;
                handleAddRule({ component: 'EXPERIENCE', categoryValue: expSelect, cargo: expCargo, points: expPoints });
                setExpSelect('');
                setExpCargo('TODOS');
                setExpPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: !expSelect ? 0.5 : 1 }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('EXPERIENCE').map((r) => (
              <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>[{r.cargo || 'TODOS'}] Tag {r.categoryValue === 'OUTSIDER' ? 'Outsider' : 'Experiente'}: <strong>{formatPoints(r.points)}</strong></span>
                <button
                  type="button"
                  onClick={() => handleDeleteRule(r.id)}
                  title="Remover esta regra"
                  aria-label="Remover regra"
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                >
                  <X size={14} className="desktop-icon-allow" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* 6. Desempenho Público (Assiduidade em Plenário) */}
        <div className="glass-card" style={{ padding: '20px' }}>
          <h3 style={{ fontSize: '1.05rem', margin: '0 0 12px 0', fontWeight: 700 }}>6. Desempenho Público (Assiduidade)</h3>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '14px' }}>
            <select
              value={perfCargo}
              onChange={(e) => setPerfCargo(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              {CARGO_OPTIONS.map((c) => (
                <option key={c} value={c}>Cargo: {c}</option>
              ))}
            </select>
            <select
              value={perfMode}
              onChange={(e) => setPerfMode(e.target.value as 'MIN' | 'MAX')}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              <option value="MIN">Assiduidade Mínima (≥)</option>
              <option value="MAX">Assiduidade Máxima (≤)</option>
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="number"
                value={perfValue}
                onChange={(e) => setPerfValue(e.target.value)}
                placeholder={perfMode === 'MIN' ? "Ex: 85" : "Ex: 79"}
                style={{ width: '85px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
              />
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
            </div>
            <NumberStepControl value={perfPoints} onChange={setPerfPoints} />
            <button
              onClick={() => {
                const val = perfValue ? parseFloat(perfValue) : 0;
                if (perfMode === 'MIN') {
                  handleAddRule({ component: 'PERFORMANCE', minValue: val, maxValue: 100, cargo: perfCargo, points: perfPoints });
                } else {
                  handleAddRule({ component: 'PERFORMANCE', minValue: 0, maxValue: val, cargo: perfCargo, points: perfPoints });
                }
                setPerfValue('85');
                setPerfCargo('TODOS');
                setPerfPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('PERFORMANCE').map((r) => {
              const isMax = r.maxValue != null && r.maxValue > 0 && (r.minValue == null || r.minValue === 0);
              const labelText = isMax ? `Assiduidade ≤ ${r.maxValue}%` : `Assiduidade ≥ ${r.minValue || 0}%`;
              return (
                <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }} title={labelText}>
                  <span>[{r.cargo || 'TODOS'}] {labelText}: <strong>{formatPoints(r.points)}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(r.id)}
                    title="Remover esta regra"
                    aria-label="Remover regra"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                  >
                    <X size={14} className="desktop-icon-allow" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* 6. Troca de Partido */}
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ fontSize: '1.05rem', marginBottom: '4px', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <GitCommit size={18} /> Troca de Partido
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '16px' }}>
            Pontue candidatos de acordo com a quantidade de mudanças de partido registradas em sua trajetória política.
          </p>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Mínimo de Trocas:</span>
              <select
                value={partySwitchMin}
                onChange={(e) => setPartySwitchMin(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
              >
                <option value="1">≥ 1 troca de partido</option>
                <option value="2">≥ 2 trocas de partido</option>
                <option value="3">≥ 3 trocas de partido</option>
                <option value="4">≥ 4 trocas de partido</option>
                <option value="5">≥ 5 trocas de partido</option>
              </select>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)' }}>Cargo:</span>
              <select
                value={partySwitchCargo}
                onChange={(e) => setPartySwitchCargo(e.target.value)}
                style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer' }}
              >
                {CARGO_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <NumberStepControl value={partySwitchPoints} onChange={setPartySwitchPoints} />

            <button
              onClick={() => {
                const minVal = parseInt(partySwitchMin, 10) || 1;
                handleAddRule({
                  component: 'PARTY_SWITCHES',
                  minValue: minVal,
                  cargo: partySwitchCargo,
                  points: partySwitchPoints,
                });
                setPartySwitchMin('1');
                setPartySwitchCargo('TODOS');
                setPartySwitchPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('PARTY_SWITCHES').map((r) => {
              const minVal = r.minValue || 1;
              const labelText = `Troca de Partido ≥ ${minVal} ${minVal === 1 ? 'troca' : 'trocas'}`;
              return (
                <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }} title={labelText}>
                  <span>[{r.cargo || 'TODOS'}] {labelText}: <strong>{formatPoints(r.points)}</strong></span>
                  <button
                    type="button"
                    onClick={() => handleDeleteRule(r.id)}
                    title="Remover esta regra"
                    aria-label="Remover regra"
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px', borderRadius: '4px' }}
                  >
                    <X size={14} className="desktop-icon-allow" />
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* 7. Área de Risco: Resetar Todas as Pontuações */}
        <div
          className="glass-card"
          style={{
            padding: '24px',
            border: '2px solid var(--border-strong)',
            borderRadius: 'var(--radius-lg)',
            marginTop: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <AlertOctagon size={20} color="var(--text-main)" className="desktop-icon-allow" />
            <h3 style={{ fontSize: '1.05rem', margin: 0, fontWeight: 800 }}>Área de Risco — Zerar Pontuações Manuais</h3>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '16px' }}>
            Esta ação apaga <strong>todas as suas pontuações manuais atribuídas a todos os candidatos</strong> na plataforma de forma definitiva.
          </p>

          <button
            type="button"
            onClick={() => setIsResetEvaluationsModalOpen(true)}
            className="btn btn-outline"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 20px',
              fontWeight: 700,
              fontSize: '0.85rem',
            }}
          >
            <Trash2 size={16} className="desktop-icon-allow" />
            <span>Zerar Todas as Minhas Pontuações</span>
          </button>

          {resetEvaluationsSuccess && (
            <div style={{ marginTop: '12px', padding: '10px', background: 'var(--bg-tertiary)', border: '1px solid var(--border-strong)', borderRadius: 'var(--radius-sm)', color: 'var(--text-main)', fontSize: '0.85rem', fontWeight: 700 }}>
              ✓ Todas as suas pontuações manuais foram zeradas com sucesso!
            </div>
          )}
        </div>

      </div>

      {/* Confirmation Modal */}
      {isResetEvaluationsModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 1000,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            style={{
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-strong)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '480px',
              width: '100%',
              padding: '24px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '1.1rem' }}>
                <AlertOctagon size={22} className="desktop-icon-allow" />
                <span>Zerar Todas as Pontuações Manuais?</span>
              </div>
              <button
                onClick={() => setIsResetEvaluationsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} className="desktop-icon-allow" />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '20px' }}>
              Esta é uma área segura do sistema. Ao confirmar, <strong>todas as pontuações manuais</strong> atribuídas por você a todos os candidatos serão apagadas definitivamente.
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setIsResetEvaluationsModalOpen(false)}
                className="btn btn-outline"
                style={{ padding: '8px 16px', borderRadius: 'var(--radius-full)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmResetAllEvaluations}
                disabled={isResettingEvaluations}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--text-main)',
                  color: 'var(--bg-primary)',
                  border: 'none',
                  fontWeight: 800,
                  fontSize: '0.85rem',
                  cursor: isResettingEvaluations ? 'not-allowed' : 'pointer',
                }}
              >
                {isResettingEvaluations ? 'Zerando...' : 'Confirmar e Zerar Todas'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScoringPage;
