import React, { useState, useEffect } from 'react';
import { Award, Save, RotateCcw, ArrowLeft, Plus, Minus, X, Settings, Trash2, AlertOctagon } from 'lucide-react';
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

export const ScoringPage: React.FC<ScoringPageProps> = ({ onRequireAuth, onGoToDashboard }) => {
  const { settings, updateSettings, user } = useApp();
  const [rules, setRules] = useState<AutoScoreRule[]>([]);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [resetSuccess, setResetSuccess] = useState<boolean>(false);

  // Form states with numeric step control & cargo filter
  const [partySelect, setPartySelect] = useState('');
  const [partyCargo, setPartyCargo] = useState('TODOS');
  const [partyPoints, setPartyPoints] = useState<number>(0);

  const [eduSelect, setEduSelect] = useState('');
  const [eduCargo, setEduCargo] = useState('TODOS');
  const [eduPoints, setEduPoints] = useState<number>(0);

  const [assetMin, setAssetMin] = useState('');
  const [assetMax, setAssetMax] = useState('');
  const [assetCargo, setAssetCargo] = useState('TODOS');
  const [assetPoints, setAssetPoints] = useState<number>(0);

  const [occSelect, setOccSelect] = useState('');
  const [occCargo, setOccCargo] = useState('TODOS');
  const [occPoints, setOccPoints] = useState<number>(0);

  const [expSelect, setExpSelect] = useState('');
  const [expCargo, setExpCargo] = useState('TODOS');
  const [expPoints, setExpPoints] = useState<number>(0);

  const [perfMin, setPerfMin] = useState('85');
  const [perfCargo, setPerfCargo] = useState('TODOS');
  const [perfPoints, setPerfPoints] = useState<number>(0);

  const [isApplying, setIsApplying] = useState<boolean>(false);
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
    const created: AutoScoreRule = {
      ...newRule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    };
    setRules((prev) => [...prev, created]);
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

  const handleReset = async () => {
    if (!user && onRequireAuth) {
      onRequireAuth();
      return;
    }
    setIsApplying(true);
    setRules([]);
    await updateSettings({
      ...settings,
      autoRulesJson: '[]',
    });
    window.dispatchEvent(new Event('criterium_rules_updated'));
    setIsApplying(false);
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
            onClick={handleReset}
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

      {/* Component Rules Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 1. Partido */}
        <div className="glass-card" style={{ padding: '20px' }}>
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
            <select
              value={partySelect}
              onChange={(e) => setPartySelect(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              <option value="">Selecione o partido</option>
              {PARTY_OPTIONS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
            <NumberStepControl value={partyPoints} onChange={setPartyPoints} />
            <button
              disabled={!partySelect}
              onClick={() => {
                if (!partySelect) return;
                handleAddRule({ component: 'PARTY', categoryValue: partySelect, cargo: partyCargo, points: partyPoints });
                setPartySelect('');
                setPartyCargo('TODOS');
                setPartyPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: !partySelect ? 0.5 : 1 }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('PARTY').map((r) => (
              <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>[{r.cargo || 'TODOS'}] Partido {r.categoryValue}: <strong>{formatPoints(r.points)}</strong></span>
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

        {/* 2. Grau de Instrução */}
        <div className="glass-card" style={{ padding: '20px' }}>
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
            <select
              value={eduSelect}
              onChange={(e) => setEduSelect(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              <option value="">Selecione o grau de instrução</option>
              {EDUCATION_OPTIONS.map((e) => (
                <option key={e} value={e}>{e}</option>
              ))}
            </select>
            <NumberStepControl value={eduPoints} onChange={setEduPoints} />
            <button
              disabled={!eduSelect}
              onClick={() => {
                if (!eduSelect) return;
                handleAddRule({ component: 'EDUCATION', categoryValue: eduSelect, cargo: eduCargo, points: eduPoints });
                setEduSelect('');
                setEduCargo('TODOS');
                setEduPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: !eduSelect ? 0.5 : 1 }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('EDUCATION').map((r) => (
              <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>[{r.cargo || 'TODOS'}] {r.categoryValue}: <strong>{formatPoints(r.points)}</strong></span>
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

        {/* 3. Patrimônio Declarado (Range) */}
        <div className="glass-card" style={{ padding: '20px' }}>
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
        <div className="glass-card" style={{ padding: '20px' }}>
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
            <select
              value={occSelect}
              onChange={(e) => setOccSelect(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
            >
              <option value="">Selecione a ocupação</option>
              {OCCUPATION_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
            <NumberStepControl value={occPoints} onChange={setOccPoints} />
            <button
              disabled={!occSelect}
              onClick={() => {
                if (!occSelect) return;
                handleAddRule({ component: 'OCCUPATION', categoryValue: occSelect, cargo: occCargo, points: occPoints });
                setOccSelect('');
                setOccCargo('TODOS');
                setOccPoints(0);
              }}
              className="btn btn-outline"
              style={{ padding: '8px 14px', fontSize: '0.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', opacity: !occSelect ? 0.5 : 1 }}
            >
              <Plus size={14} className="desktop-icon-allow" /> Adicionar Regra
            </button>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {getRulesByComponent('OCCUPATION').map((r) => (
              <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>[{r.cargo || 'TODOS'}] {r.categoryValue}: <strong>{formatPoints(r.points)}</strong></span>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Assiduidade Mínima (%):</span>
              <input
                type="number"
                value={perfMin}
                onChange={(e) => setPerfMin(e.target.value)}
                placeholder="Ex: 85"
                style={{ width: '80px', padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-subtle)', color: 'var(--text-main)', fontWeight: 600 }}
              />
            </div>
            <NumberStepControl value={perfPoints} onChange={setPerfPoints} />
            <button
              onClick={() => {
                const minVal = perfMin ? parseFloat(perfMin) : 0;
                handleAddRule({ component: 'PERFORMANCE', minValue: minVal, cargo: perfCargo, points: perfPoints });
                setPerfMin('85');
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
            {getRulesByComponent('PERFORMANCE').map((r) => (
              <span key={r.id} className="badge badge-neutral" style={{ padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>[{r.cargo || 'TODOS'}] Assiduidade ≥ {r.minValue || 0}%: <strong>{formatPoints(r.points)}</strong></span>
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

        {/* 6. Área de Risco: Resetar Todas as Pontuações */}
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
