import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, User, Building, Users, Globe, Briefcase, UserCheck } from 'lucide-react';

interface PartyData {
  sigla: string;
  count: number;
}

interface MacroData {
  totalActiveDeputies?: number;
  totalActiveSenators?: number;
  parties: PartyData[];
  timestamp: string;
}

interface BlocData {
  name: string;
  count: number;
}

interface ThematicBlocs {
  blocs: BlocData[];
  timestamp: string;
}

export const InformationPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState<number>(0);
  const [chamberData, setChamberData] = useState<MacroData | null>(null);
  const [senateData, setSenateData] = useState<MacroData | null>(null);
  const [blocsData, setBlocsData] = useState<ThematicBlocs | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAllMacro = async () => {
      try {
        const [cRes, sRes, bRes] = await Promise.all([
          fetch(`/api/macro/chamber_composition`),
          fetch(`/api/macro/senate_composition`),
          fetch(`/api/macro/thematic_blocs`)
        ]);

        if (cRes.ok) setChamberData(await cRes.json());
        if (sRes.ok) setSenateData(await sRes.json());
        if (bRes.ok) setBlocsData(await bRes.json());
      } catch (error) {
        console.error('Failed to fetch macro data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllMacro();
  }, []);

  const nextSlide = () => setCurrentSlide((prev) => Math.min(prev + 1, 3));
  const prevSlide = () => setCurrentSlide((prev) => Math.max(prev - 1, 0));

  const renderSlideIndicators = () => (
    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', margin: '24px 0' }}>
      {[0, 1, 2, 3].map((idx) => (
        <div
          key={idx}
          onClick={() => setCurrentSlide(idx)}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: currentSlide === idx ? 'var(--text-main)' : 'var(--border-strong)',
            cursor: 'pointer',
            transition: 'var(--transition)'
          }}
        />
      ))}
    </div>
  );

  const renderHemicycle = (title: string, total: number, data: MacroData | null) => {
    if (!data) return null;
    return (
      <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1rem' }}>{title}</h4>
        <div style={{ position: 'relative', width: '100%', maxWidth: '240px', margin: '0 auto', paddingBottom: '20px' }}>
          <svg viewBox="0 0 200 100" style={{ width: '100%', height: 'auto' }}>
            <path d="M 10 100 A 90 90 0 0 1 190 100" fill="none" stroke="var(--border-strong)" strokeWidth="20" strokeLinecap="round" />
            <path d="M 10 100 A 90 90 0 0 1 100 10" fill="none" stroke="var(--text-muted)" strokeWidth="20" strokeLinecap="round" />
            <path d="M 100 10 A 90 90 0 0 1 140 20" fill="none" stroke="var(--text-main)" strokeWidth="20" strokeLinecap="round" />
          </svg>
          <div style={{ position: 'absolute', bottom: '0', width: '100%', textAlign: 'center', fontWeight: 700, fontSize: '1.2rem' }}>
            {total} <span style={{ fontSize: '0.8rem', fontWeight: 400, color: 'var(--text-muted)' }}>Cadeiras</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTopParties = (data: MacroData | null) => {
    if (!data) return null;
    const topParties = data.parties.slice(0, 5); // Show top 5
    const maxCount = Math.max(...topParties.map((p) => p.count));

    return (
      <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>Maiores Partidos</h4>
        {topParties.map((party) => (
          <div key={party.sigla} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '50px', fontWeight: 600, fontSize: '0.75rem', textAlign: 'right' }}>
              {party.sigla}
            </div>
            <div style={{ flex: 1, background: 'var(--bg-tertiary)', height: '16px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
              <div 
                style={{ 
                  width: `${(party.count / maxCount) * 100}%`, 
                  background: 'var(--text-main)', 
                  height: '100%',
                  transition: 'width 1s ease-out' 
                }} 
              />
            </div>
            <div style={{ width: '24px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {party.count}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderThematicBlocs = () => {
    if (!blocsData) return null;
    // Base is 513 deputies
    return (
      <div style={{ marginTop: '40px', borderTop: '1px solid var(--border-subtle)', paddingTop: '24px' }}>
        <h4 style={{ margin: '0 0 16px 0', fontSize: '1.2rem' }}>Bancadas Temáticas (Frentes Parlamentares)</h4>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '24px' }}>
          Tamanho relativo das principais Frentes em proporção ao total de 513 deputados na Câmara.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {blocsData.blocs.sort((a, b) => b.count - a.count).map(bloc => (
            <div key={bloc.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px', fontSize: '0.9rem' }}>
                <span style={{ fontWeight: 600 }}>{bloc.name}</span>
                <span style={{ color: 'var(--text-muted)' }}>{bloc.count} assinaturas</span>
              </div>
              <div style={{ width: '100%', background: 'var(--bg-tertiary)', height: '24px', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
                <div 
                  style={{ 
                    width: `${Math.min((bloc.count / 513) * 100, 100)}%`, 
                    background: 'var(--text-muted)', 
                    height: '100%',
                    transition: 'width 1s ease-out' 
                  }} 
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="container" style={{ padding: '24px 16px', maxWidth: '800px', margin: '0 auto', paddingBottom: '100px' }}>
      
      {renderSlideIndicators()}

      <div style={{ background: 'var(--bg-secondary)', borderRadius: 'var(--radius-lg)', padding: '32px', border: '1px solid var(--border-subtle)', minHeight: '60vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* SLIDE 01: Quem eu voto */}
        {currentSlide === 0 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Users size={28} /> Quem eu voto?
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Entenda as atribuições e distinções de cada cargo público em disputa nas eleições.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                  <Globe size={24} color="var(--text-main)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Presidente da República</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Chefe de Estado e de Governo. Responsável pela administração federal, sanção de leis, relações internacionais e comando das Forças Armadas.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                  <Building size={24} color="var(--text-main)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Governador</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Chefe do Executivo Estadual. Administra o estado, com foco direto em Segurança Pública, Saúde Estadual, Infraestrutura e Educação Básica.
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                  <UserCheck size={24} color="var(--text-main)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Senador</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Representante do Estado no Congresso Nacional. Mandato de 8 anos. Revisa leis, aprova orçamentos e julga autoridades (como o Presidente da República e Ministros do STF).
                  </p>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                  <Briefcase size={24} color="var(--text-main)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Deputado Federal e Estadual</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    Representantes do Povo. Responsáveis por propor e aprovar leis (Federais ou Estaduais) e fiscalizar o Poder Executivo (Presidente ou Governador).
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 02: Como escolher um candidato */}
        {currentSlide === 1 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <User size={28} /> Como escolher um candidato
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Parâmetros recomendados por especialistas para uma análise técnica.
            </p>

            <ul style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '16px', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6 }}>
              <li>
                <strong>Expressão do Partido Político:</strong> Candidatos de partidos com grandes bancadas possuem mais facilidade de aprovar projetos, devido ao controle das pautas e presidências de comissões [1].
              </li>
              <li>
                <strong>Alinhamento nas Votações:</strong> Analise se o histórico de votações do candidato reflete o seu discurso de campanha em temas sensíveis (economia, costumes, política externa) [2].
              </li>
              <li>
                <strong>Capacidade de Composição (Governo):</strong> Para cargos do Executivo, o candidato dependerá fortemente de uma base sólida na Câmara/Senado ou Assembleia. Sem alianças, a governabilidade é severamente prejudicada [3].
              </li>
              <li>
                <strong>Visão Internacional do Brasil:</strong> No caso do Executivo Federal e Senado, as relações exteriores e o perfil de alianças ditam a atratividade de investimentos estrangeiros e parcerias comerciais [4].
              </li>
            </ul>

            <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong>Fontes e Citações:</strong><br/>
              [1] Figueiredo, A. & Limongi, F. (1999). <em>Executivo e Legislativo na Nova Ordem Constitucional</em>. Editora FGV.<br/>
              [2] Nicolau, J. (2004). <em>Partidos na redemocratização</em>.<br/>
              [3] Mainwaring, S. (1999). <em>Rethinking Party Systems in the Third Wave of Democratization</em>. Stanford University Press.<br/>
              [4] Cervo, A. L., & Bueno, C. (2002). <em>História da política exterior do Brasil</em>. Editora UnB.
            </div>
          </div>
        )}

        {/* SLIDE 03: Como está o Brasil hoje */}
        {currentSlide === 2 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={28} /> Congresso Nacional Hoje
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              A composição atual das Casas Legislativas e das principais Bancadas Temáticas reflete o equilíbrio de forças real. 
              (Dados extraídos ao vivo via Portal de Dados Abertos).
            </p>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Carregando métricas macro...</div>
            ) : (chamberData || senateData || blocsData) ? (
              <>
                <div className="responsive-bancada">
                  {/* Câmara Block */}
                  <div style={{ flex: '1 1 300px', display: 'flex', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', width: '100%' }}>
                    {renderHemicycle('Câmara dos Deputados', chamberData?.totalActiveDeputies || 513, chamberData)}
                    {renderTopParties(chamberData)}
                  </div>

                  {/* Senado Block */}
                  <div style={{ flex: '1 1 300px', display: 'flex', flexWrap: 'wrap', gap: '16px', background: 'var(--bg-primary)', padding: '16px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', width: '100%' }}>
                    {renderHemicycle('Senado Federal', senateData?.totalActiveSenators || 81, senateData)}
                    {renderTopParties(senateData)}
                  </div>
                </div>

                {renderThematicBlocs()}

                <div style={{ marginTop: '32px', fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                  Última atualização: {new Date(chamberData?.timestamp || Date.now()).toLocaleString('pt-BR')}
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Dados macro não disponíveis no momento.</div>
            )}
          </div>
        )}

        {/* SLIDE 04: Relações Internacionais e Geopolítica */}
        {currentSlide === 3 && (
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Globe size={28} /> Cenário Internacional e Geopolítica
            </h2>
            <p style={{ color: 'var(--text-muted)', marginBottom: '32px' }}>
              Visão geral das relações exteriores do Brasil e previsões de reação global conforme o alinhamento político do próximo presidente.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {/* Parceiros Comerciais */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                  <Briefcase size={24} color="var(--text-main)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Principais Parceiros (Panorama Atual)</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    O Brasil adota historicamente uma postura de <strong>pragmatismo universalista</strong>. Nossos maiores parceiros comerciais são: 
                    <strong> China</strong> (exportação de commodities agropecuárias e minerais), 
                    <strong> Estados Unidos</strong> (exportação de manufaturados e serviços) e a 
                    <strong> União Europeia</strong> (investimento estrangeiro direto e comércio diversificado). A adesão aos <strong>BRICS</strong> e ao <strong>Mercosul</strong> ditam grande parte das alianças em bloco.
                  </p>
                </div>
              </div>

              {/* Projeção: Presidente Progressista/Esquerda */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start', marginTop: '12px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                  <Users size={24} color="var(--text-main)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Impacto de um Governo Progressista/Esquerda</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong>Reação Global:</strong> Geralmente resulta em maior facilidade de diálogo com a União Europeia devido ao alinhamento em pautas climáticas, direitos humanos e preservação da Amazônia, destravando fundos de proteção ambiental. 
                    Tende a fortalecer o eixo Sul-Sul (África, América Latina, BRICS), mas pode gerar atritos comerciais ou distanciamento diplomático com potências ocidentais mais conservadoras, dependendo da postura adotada em relação a países sob sanção internacional.
                  </p>
                </div>
              </div>

              {/* Projeção: Presidente Conservador/Direita */}
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '50%' }}>
                  <Building size={24} color="var(--text-main)" />
                </div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Impacto de um Governo Conservador/Direita</h3>
                  <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    <strong>Reação Global:</strong> Costuma priorizar acordos bilaterais focados no pragmatismo econômico e desregulamentação, buscando forte aproximação com os Estados Unidos, Israel e investidores corporativos de livre mercado. 
                    No entanto, sofre enorme pressão da comunidade europeia e de ONGs internacionais devido à flexibilização de pautas ambientais e demarcações de terras, o que pode paralisar acordos como o Mercosul-União Europeia e gerar boicotes a produtos do agronegócio brasileiro.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 'auto', paddingTop: '32px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <strong>Fontes e Leituras Recomendadas:</strong><br/>
              [1] <a href="https://www.cebri.org/br/publicacoes" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>CEBRI - Centro Brasileiro de Relações Internacionais (Publicações e Dossiês)</a><br/>
              [2] <a href="https://www.scielo.br/j/rbpi/" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>Revista Brasileira de Política Internacional (SciELO)</a><br/>
              [3] <a href="https://www.ipea.gov.br/portal/categorias/estudos-internacionais" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', color: 'inherit' }}>IPEA - Diretoria de Estudos Internacionais</a>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '32px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <button
            onClick={prevSlide}
            disabled={currentSlide === 0}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-strong)',
              color: currentSlide === 0 ? 'var(--text-muted)' : 'var(--text-main)',
              cursor: currentSlide === 0 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
            <ChevronLeft size={16} /> Anterior
          </button>
          <button
            onClick={nextSlide}
            disabled={currentSlide === 3}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              background: currentSlide === 3 ? 'var(--bg-tertiary)' : 'var(--text-main)',
              border: '1px solid var(--border-strong)',
              color: currentSlide === 3 ? 'var(--text-muted)' : 'var(--bg-primary)',
              cursor: currentSlide === 3 ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontWeight: 600
            }}
          >
            Próxima <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};
