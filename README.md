# Criterium - Sistema Eleitoral de Análise Técnico-Objetiva

**Criterium** é uma plataforma self-hosted de análise política e eleitoral estruturada para permitir que eleitores avaliem candidatos com base em dados técnicos reais, estatísticas públicas e pontuações personalizadas, eliminando o viés da propaganda política.

---

## 🚀 Funcionalidades Principais

- **Banco de Dados Integrado por Eleição e Cargo**:
  - Filtro por Anos Eleitorais (ex: **2026**, **2024**) e Cargos (**Presidente, Governador, Senador, Deputado Federal, Prefeito**).
  - Dossiê detalhado com informações pessoais, instrução, patrimônio declarado e coligação.
- **Sistema de Pontuação Dinâmica e Personalizada**:
  - **Métricas Objetivas (A-políticas)**: Frequência em plenárias, taxa de aprovação de projetos, economia de cotas públicas e histórico judicial/Ficha Limpa com pontuação automática.
  - **Pesos Personalizáveis por Usuário**: O eleitor ajusta nas configurações os multiplicadores de detratores/promotores para cada tópico (ex: maior punição para antecedentes criminais ou maior peso para economia de recursos).
  - **Avaliação Manual (Dados de Opinião)**: O eleitor atribui notas de **-5 a +5** diretamente em propostas, trajetória de carreira e polêmicas.
  - **Leaderboard / Ranking Dinâmico**: Ordenação em tempo real dos candidatos com base na nota composta calculada especificamente para o eleitor.
- **Arquitetura Self-Hosted Docker Compose**:
  - Estrutura profissional em 4 containers isolados: `db` (PostgreSQL 16), `api` (Express + TypeScript + Prisma), `crawler` (Worker de ingestão) e `web` (React + NGINX PWA).
- **Progressive Web App (PWA)**:
  - Instalável nativamente em celulares Android/iOS e navegadores desktop como um aplicativo (suporte a Service Worker e Web App Manifest).
- **Segurança Moderníssima**:
  - Autenticação JWT, hashing de senhas com bcrypt, sanitização Zod, headers Helmet, rate-limiting contra ataques DoS e conexões parametrizadas no banco de dados.

---

## 🛠️ Como Executar com Docker Compose

### Pré-requisitos
- Docker Engine e Docker Compose instalados no sistema.

### Passo 1: Clonar o Repositório e Configurar Variáveis
```bash
cp .env.example .env
```

### Passo 2: Subir os Containers
```bash
docker compose up -d --build
```

O Docker Compose irá inicializar automaticamente:
1. `criterium_db`: Banco de dados PostgreSQL 16 na porta `5432`.
2. `criterium_api`: API RESTful na porta `4000`.
3. `criterium_crawler`: Executa a carga inicial da base de dados com eleições, cargos e candidatos simulados/reais.
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
│   ├── src/                 # Controllers, rotas, middlewares e calculadora de score
│   └── Dockerfile
├── crawler/                 # Worker de ingestão de dados eleitorais
│   ├── src/                 # Script de carga e dados simulados/curados
│   └── Dockerfile
└── frontend/                # Aplicação Web PWA (React + Vite + NGINX)
    ├── public/              # Manifest PWA e Service Worker
    ├── src/                 # Componentes, Páginas, Contextos e Design System Glassmorphism
    └── Dockerfile
```

---

## 🛡️ Segurança e Escalabilidade na Nuvem

- **Stateless API**: O backend pode ser horizontalmente escalado atrás de um Load Balancer (AWS ECS, Google Cloud Run, Kubernetes).
- **Connection Pooling**: PostgreSQL com Prisma Connection Pool pronto para suportar milhares de requisições simultâneas.
- **Preparado para Cache & Filas**: Estrutura desenhada para acoplar **Redis** como cache de rankings e **BullMQ** para crawlers em larga escala quando necessário.
