# 📋 Roteiro de Evolução e Próximas Fases — Projeto Criterium

Este documento consolida as funcionalidades e módulos que compõem o planejamento estratégico oficial das **próximas fases de desenvolvimento** da plataforma Criterium.

---

## 🏛️ Fase 1: Desempenho Público
Focada em trazer dados factuais de desempenho dos candidatos experientes nos mandatos anteriores, utilizando exclusivamente APIs abertas e oficiais de órgãos governamentais (Câmara dos Deputados, Senado Federal, Tribunal de Contas da União e CGU/Portal da Transparência):

- **Fase 1.1 — Indicadores de Atuação & Gestão (Foco Atual)**:
  - **Legislativo (Deputados/Senadores)**: Frequência e assiduidade na função (presença em sessões ordinárias/extraordinárias de Plenário e Comissões); produção legislativa e proposições apresentadas/aprovadas; relatorias de comissões.
  - **Executivo (Presidente/Governadores)**: Presença e assiduidade nos compromissos oficiais da Agenda Pública de Governo; julgamento factual das Contas Anuais de Gestão pelos Tribunais de Contas (TCU / TCEs); cumprimento de limites fiscais e metas de aplicação constitucional.
- **Fase 1.2 — Economia Fiscal & Cota Parlamentar (Subfase Seguinte)**:
  - Monitoramento de uso da verba de gabinete (CEAP) e cotas de exercício do mandato.
  - Indicador de economia fiscal em relação ao limite máximo permitido por lei.

---

## ⚖️ Fase 2: Histórico Criminal e Registros Judiciais (Ficha Limpa)
Módulo dedicado ao acompanhamento da situação jurídica do candidato:

- **Acompanhamento Processual Factual**:
  - Integração com dados públicos de tribunais (STF, STJ, TRFs, TJs e Justiça Eleitoral).
  - Exibição de status factual do processo (*Sob investigação*, *Réu*, *Absolvido*, *Condenado* ou *Arquivado*).
- **Classificação e Transparência**:
  - Categorização do grau de severidade e tema do processo (Improbidade administrativa, Crimes contra a administração pública, Eleitoral, etc.).
  - Link público direto para a numeração única do processo e tribunal de origem.

---

## 📰 Fase 3: Histórico de Polêmicas, Controvérsias e Votações Marcantes
Módulo para contextualização histórica e posicionamento político factual:

- **Registros de Polêmicas e Controvérsias Públicas**:
  - Documentação de eventos marcantes, declarações e investigações com nível de impacto categorizado (Alto, Médio, Baixo).
  - Vínculo com fontes jornalísticas factuais e documentos oficiais.
- **Histórico de Votações em Pautas Decisivas**:
  - Mapeamento de votos do candidato em propostas de grande impacto nacional ou estadual (reformas, orçamento, cassações, PECs).

---

## 📄 Fase 4 (Fase Final): Análise e Auditoria de Planos de Governo
Fase dedicada ao aprofundamento das propostas futuras para o poder executivo e legislativo:

- **Parsing e Indexação de Planos de Governo (PDFs do TSE)**:
  - Leitura automatizada e extração de texto dos PDFs oficiais de governo depositados no TSE.
  - Categorização temática automática de propostas por eixos (Saúde, Educação, Segurança Pública, Economia, Emprego, Meio Ambiente).
- **Painel Comparativo de Propostas**:
  - Interface comparativa lado a lado entre os planos de governo de dois ou mais candidatos concorrentes do mesmo cargo/UF.

---

*Documento atualizado de acordo com o plano de desenvolvimento oficial do Criterium.*
