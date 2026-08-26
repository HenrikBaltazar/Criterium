# 🏛️ Criterium — Plataforma Eleitoral de Análise Técnico-Objetiva

**Criterium** é uma aplicação web *self-hosted* de análise política e eleitoral criada para permitir que eleitores analisem candidatos a cargos públicos com base em dados técnicos reais, estatísticas oficiais e critérios de avaliação definidos pelo próprio cidadão, eliminando o viés da propaganda partidária.

---

## 🧠 Linha de Pensamento & Filosofia do Projeto

### ⚖️ 1. A Régua Pessoal do Eleitor e a Pontuação Dinâmica
> **Linha de Pensamento**: *A importância de cada fato, proposta ou histórico varia de eleitor para eleitor. Nenhuma plataforma deve impor valores ou julgamentos morais pré-definidos.*

- **Motor de Cálculo Automático**: O Criterium não aplica pesos arbitrários nem multiplicadores engessados. A aplicação fornece a estrutura computacional, e o resultado final de cada candidato é calculado dinamicamente com base nas regras configuradas na **Régua Pessoal** de cada usuário.
- **Escala de Pontuação Aberta e Flexível**: A pontuação atribuída a cada critério possui uma escala numérica ilimitada (ex: **+10, -50, +100, +500**). Isso garante que o eleitor possa refletir numericamente a exata proporcionalidade que um fato ou diretriz de governo representa na sua tomada de decisão.
- **Auditoria por Anotações Personalizadas**: O eleitor pode registrar anotações vinculadas ao candidato, acompanhadas de fonte, data e pontuação, alimentando diretamente o somatório total de forma rastreável.

---

### ⬛⬜ 2. Imparcialidade Visual: A Filosofia da Estrita Monocromia
> **Linha de Pensamento**: *NÓS NÃO UTILIZAMOS CORES. As cores na política carregam viés ideológico subliminar e induzem o julgamento do usuário.*

- **Eliminação do Viés Partidário**: No universo político, cores (como vermelho, azul, verde ou amarelo) estão associadas a correntes ideológicas ou partidos específicos. O uso de cores na interface poderia induzir preferências de forma subliminar.
- **Ausência de Indução Moral**: Classificar indicadores com cores (como verde para "bom" e vermelho para "ruim") é impor uma avaliação da plataforma sobre o usuário. No Criterium, a interface é **100% monocromática (preto, branco e tons de cinza puros com $R = G = B$)**, garantindo que a tela seja uma tela neutra sobre a qual apenas a avaliação do eleitor se manifesta.
- **Garantia por Teste de Regressão**: O repositório conta com um teste de regressão automatizado (`colorMonochromeAudit.test.ts`) que inspeciona 100% dos arquivos CSS e TSX do frontend para impedir a inclusão acidental de qualquer código de cor não-monocromático.

---

### 🔍 3. Rastreabilidade Factual e Transparência
> **Linha de Pensamento**: *A confiança do eleitor decorre da capacidade de auditar cada informação na sua fonte primária.*

- **Hiperlinks Interativos em Todos os Dados**: Cada item do dossiê do candidato — desde declaração de bens e mandatos passados até o detalhamento de pontuação — é acompanhado por links diretos com o ícone `<ExternalLink />` apontando para o registro oficial correspondente no TSE ou nas casas legislativas.
- **Sem Dados Fictícios ou Estimativas**: Informações parlamentares e de assiduidade são exibidas estritamente quando há registros factuais validados. Na ausência de dados oficiais, os componentes são omitidos para evitar desinformação.

---

### 🤖 4. IA Client-Side: Soberania e Privacidade no Navegador
> **Linha de Pensamento**: *A consulta a propostas políticas deve ser livre de monitoramento externo, sem envio de dados a servidores de terceiros.*

- **Processamento 100% no Dispositivo do Usuário**: A análise e o chat com o Plano de Governo do candidato utilizam modelos de IA executados diretamente no navegador via **WebGPU (`Llama-3.2-1B-Instruct` via WebLLM)** ou pela API nativa **Chrome Built-in AI (`Gemini Nano`)**.
- **Indexação Transparente de PDF (`PDF.js`)**: O documento oficial registrado no TSE é baixado sob demanda e lido página a página pelo navegador, citando explicitamente o número da página de onde cada resposta foi extraída.
- **Exibição Condicional Estrita (`isClientAiAvailable`)**: O componente de chat é exibido apenas em navegadores com capacidade de IA local detectada (WebGPU ou Chrome AI), prevenindo o uso de fallbacks sintéticos ou APIs remotas de terceiros.
- **⚠️ Status de Desenvolvimento (Recurso Experimental em Testes)**: A funcionalidade de Inteligência Artificial Client-Side para análise do Plano de Governo encontra-se em fase experimental de testes e validação. Por depender de capacidades locais do navegador (WebGPU / Chrome AI), ainda não deve ser considerada 100% funcional ou definitiva.

---

## 🚀 Funcionalidades da Aplicação

- **Filtro Multi-Eleição e Multi-Cargo**: Navegação por anos eleitorais (**2026**, **2024**) e cargos (**Presidente, Governador, Senador, Deputado Federal, Prefeito**).
- **Dossiê Completo do Candidato**: Informações pessoais, instrução, bens declarados, coligações, histórico de mandatos e desempenho parlamentar.
- **Régua Pessoal & Detalhamento de Pontos**: Ajuste dinâmico das regras de pontuação com atualização do ranking em tempo real.
- **Chat com o Plano de Governo**: Consulta interativa com o PDF oficial via IA Client-side e citação de páginas.
- **Progressive Web App (PWA)**: Aplicação instalável nativamente em dispositivos móveis (Android/iOS) e desktop, com suporte a Service Worker.

---

## 🛠️ Como Executar com Docker Compose

### Pré-requisitos
- Docker Engine e Docker Compose instalados no sistema.

### Passo 1: Configurar Variáveis de Ambiente
```bash
cp .env.example .env
```

### Passo 2: Subir os Containers
```bash
docker compose up -d --build
```

Os 4 containers da aplicação serão inicializados:
1. `criterium_db`: Banco de dados PostgreSQL 16 na porta `5432`.
2. `criterium_api`: API RESTful (Node.js + Express + Prisma) na porta `4000`.
3. `criterium_crawler`: Worker de ingestão de dados eleitorais oficiais.
4. `criterium_web`: Frontend NGINX PWA na porta `80`.

### Passo 3: Acessar a Aplicação
Abra o navegador em [http://localhost](http://localhost).

---

## 📐 Estrutura do Projeto

```
/
├── docker-compose.yml       # Orquestração dos containers
├── .env.example             # Modelo de variáveis de ambiente
├── backend/                 # API RESTful (Node.js + Express + Prisma)
│   ├── prisma/              # Schema PostgreSQL e migrations
│   ├── src/                 # Controllers, rotas e calculadora de score pela régua pessoal
│   └── Dockerfile
├── crawler/                 # Worker de ingestão e carga de dados eleitorais
│   ├── src/                 # Scripts de parsing e carga do TSE
│   └── Dockerfile
├── frontend/                # Aplicação Web PWA (React + Vite + NGINX)
│   ├── public/              # Manifest PWA e Service Worker
│   ├── src/                 # Componentes, Páginas, Contextos e Utilitários de IA
│   └── Dockerfile
└── tests/                   # Suíte de testes automatizados e validações de UI/Cores
```

---

## 🛡️ Suíte de Testes Automatizados

O repositório possui uma suíte completa de validações automatizadas:
```bash
cd tests
npm test
```
A suíte valida os algoritmos da Régua Pessoal, a auditoria de regressão monocromática em 100% dos arquivos do frontend, roteamento, PWA e fluxos de navegação.
