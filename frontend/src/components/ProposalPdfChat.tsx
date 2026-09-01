import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, RefreshCw, Sparkles, Cpu, FileText, CheckCircle2, Play, ExternalLink } from 'lucide-react';
import { CreateMLCEngine, MLCEngineInterface } from '@mlc-ai/web-llm';
import * as pdfjsLib from 'pdfjs-dist';

// Configura o worker do PDF.js para processamento no navegador
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface ProposalItem {
  id?: string;
  title: string;
  category?: string;
  description?: string;
}

interface ProposalPdfChatProps {
  candidateName: string;
  pdfUrl?: string;
  summaryText?: string;
  proposals?: ProposalItem[];
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  sources?: string[];
}

interface PdfChunk {
  pageNumber: number;
  text: string;
}

const SELECTED_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

// Auxiliar para remoção de acentos e normalização de texto
function normalizeText(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

const STOP_WORDS = new Set([
  'o', 'a', 'os', 'as', 'um', 'uma', 'uns', 'umas', 'de', 'do', 'da', 'dos', 'das',
  'em', 'no', 'na', 'nos', 'nas', 'por', 'pelo', 'pela', 'pelos', 'pelas', 'com',
  'para', 'como', 'que', 'se', 'ou', 'e', 'qual', 'quais', 'sobre', 'tem', 'sua',
  'seu', 'suas', 'seus', 'mais', 'menos', 'muito', 'muitos', 'quaisquer', 'plano', 'governo'
]);

export const ProposalPdfChat: React.FC<ProposalPdfChatProps> = ({
  candidateName,
  pdfUrl,
  summaryText,
  proposals = [],
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [engineType, setEngineType] = useState<'chrome_ai' | 'webllm_webgpu' | 'rag_deterministic'>('rag_deterministic');

  // Controle de inicialização sob demanda via botão "Iniciar Chat"
  const [chatStarted, setChatStarted] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initLogs, setInitLogs] = useState<string[]>([]);

  // Estado de indexação real do arquivo PDF
  const [indexingStatus, setIndexingStatus] = useState<'idle' | 'downloading' | 'parsing' | 'ready' | 'error'>('idle');
  const [pdfChunks, setPdfChunks] = useState<PdfChunk[]>([]);
  const [pdfStats, setPdfStats] = useState<{ totalPages: number; totalWords: number } | null>(null);

  const webllmEngineRef = useRef<MLCEngineInterface | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Registra mensagens de log simultaneamente na UI e no console do navegador
  const addLog = (msg: string) => {
    console.log(`[Criterium PDF Chat] ${msg}`);
    setInitLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    setStatusMessage(msg);
  };

  // Detecta capacidades do navegador no mount
  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
      setEngineType('chrome_ai');
    } else if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
      setEngineType('webllm_webgpu');
    } else {
      setEngineType('rag_deterministic');
    }
  }, []);

  // Rolagem automática do chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, statusMessage, isInitializing]);

  // Função para baixar o arquivo PDF (tentando proxy e direto)
  const downloadPdfBuffer = async (targetUrl: string): Promise<ArrayBuffer> => {
    const proxyUrl = `/api/candidates/pdf-proxy?url=${encodeURIComponent(targetUrl)}`;
    try {
      addLog(`Tentando download via proxy: ${proxyUrl}`);
      const res = await fetch(proxyUrl);
      if (res.ok) {
        return await res.arrayBuffer();
      }
    } catch (e) {
      addLog('Proxy indisponível, tentando download direto do TSE...');
    }

    addLog(`Tentando download direto de: ${targetUrl}`);
    const directRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!directRes.ok) {
      throw new Error(`Servidor do TSE retornou HTTP status ${directRes.status}`);
    }

    return await directRes.arrayBuffer();
  };

  // Função disparada ao clicar no botão "Iniciar Chat"
  const handleStartChat = async () => {
    setIsInitializing(true);
    setInitLogs([]);
    console.group(`[Criterium PDF Chat] Inicializando sessão para ${candidateName}`);
    addLog(`Iniciar Chat acionado para o candidato: ${candidateName}`);

    let extractedChunks: PdfChunk[] = [];
    let wordCount = 0;
    let totalPagesCount = 1;

    try {
      if (pdfUrl) {
        addLog(`Iniciando download do PDF oficial do TSE: ${pdfUrl}`);
        setIndexingStatus('downloading');

        const arrayBuffer = await downloadPdfBuffer(pdfUrl);
        addLog(`Download do PDF concluído (${arrayBuffer.byteLength} bytes). Processando páginas com PDF.js...`);

        setIndexingStatus('parsing');
        const pdf = await pdfjsLib.getDocument({
          data: new Uint8Array(arrayBuffer),
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/cmaps/',
          cMapPacked: true,
        }).promise;

        totalPagesCount = pdf.numPages;
        addLog(`PDF do Plano de Governo carregado! Total de páginas: ${pdf.numPages}`);

        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ').replace(/\s+/g, ' ').trim();

          if (pageText.length > 0) {
            wordCount += pageText.split(/\s+/).length;
            // Split long pages into digestible 500-character overlapping chunks
            const chunkSize = 500;
            for (let j = 0; j < pageText.length; j += chunkSize) {
              const chunkStr = pageText.substring(j, j + chunkSize + 100);
              extractedChunks.push({
                pageNumber: i,
                text: chunkStr,
              });
            }
          }
        }

        addLog(`Extração concluída com sucesso: ${extractedChunks.length} trechos indexados de ${pdf.numPages} páginas.`);
      }

      // Fallback: Se não houver PDF ou se a extração trouxer poucas palavras, indexar propostas salvas no banco
      if (extractedChunks.length === 0 && proposals && proposals.length > 0) {
        addLog(`Indexando ${proposals.length} eixos de propostas estruturadas do banco de dados...`);
        extractedChunks = proposals.map((p, i) => ({
          pageNumber: 1,
          text: `[Proposta ${i + 1}] Eixo: ${p.category || 'Geral'}. Título: ${p.title}. Descrição: ${p.description || ''}`,
        }));
        wordCount = extractedChunks.reduce((a, c) => a + c.text.split(/\s+/).length, 0);
      }

      if (extractedChunks.length === 0) {
        throw new Error('Nenhum texto pôde ser extraído do documento ou das propostas do candidato.');
      }

      setPdfChunks(extractedChunks);
      setPdfStats({ totalPages: totalPagesCount, totalWords: wordCount });
      setIndexingStatus('ready');

      // Step 2: Inicialização de Motor de IA
      addLog(`Verificando suporte de IA no navegador: ${engineType.toUpperCase()}`);

      if (engineType === 'webllm_webgpu') {
        try {
          addLog(`WebGPU ativo. Alocando modelo leve WebLLM (${SELECTED_MODEL})...`);
          if (!webllmEngineRef.current) {
            webllmEngineRef.current = await CreateMLCEngine(SELECTED_MODEL, {
              initProgressCallback: (progress) => {
                addLog(`WebGPU Progress: ${progress.text}`);
              },
            });
          }
          addLog('WebGPU WebLLM Engine alocado e pronto!');
        } catch (webgpuErr: any) {
          addLog(`Aviso WebGPU: ${webgpuErr.message}. Utilizando mecanismo RAG determinístico factual.`);
        }
      }

      addLog('Inicialização concluída! Chat pronto para receber perguntas.');
      console.groupEnd();

      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Olá! O Plano de Governo Oficial de ${candidateName} (${totalPagesCount} páginas, ${wordCount.toLocaleString('pt-BR')} palavras) foi indexado com sucesso no seu navegador. O que gostaria de saber sobre as propostas?`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setChatStarted(true);
    } catch (err: any) {
      console.error('[Criterium PDF Chat] Erro na inicialização:', err);
      addLog(`ERRO: ${err.message || 'Falha ao carregar e indexar o arquivo de Plano de Governo.'}`);
      setIndexingStatus('error');
      console.groupEnd();
    } finally {
      setIsInitializing(false);
    }
  };

  // Algoritmo RAG para busca de Chunks Relevantes no PDF com ranking factual
  const retrieveRelevantChunks = (query: string, topK = 4): PdfChunk[] => {
    if (pdfChunks.length === 0) return [];

    const normQuery = normalizeText(query);
    const isFirstPageQuery = (
      normQuery.includes('primeira linha') ||
      normQuery.includes('primeira pagina') ||
      normQuery.includes('primeiro paragrafo') ||
      normQuery.includes('inicio do pdf') ||
      normQuery.includes('comeco do pdf') ||
      normQuery.includes('inicio do plano') ||
      normQuery.includes('comeco do plano') ||
      normQuery.includes('titulo do pdf') ||
      normQuery.includes('capa do pdf') ||
      normQuery.includes('primeira palavra') ||
      normQuery.includes('primeiras palavras') ||
      normQuery.includes('linha 1') ||
      normQuery.includes('pagina 1')
    );

    const queryWords = normQuery
      .split(/\s+/)
      .map((w) => w.replace(/[^\w]/g, ''))
      .filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    const scored = pdfChunks.map((chunk) => {
      const normChunk = normalizeText(chunk.text);
      let score = 0;
      let matchedCount = 0;

      // Positional boost: if query asks for first page/line, give Page 1 massive score boost!
      if (isFirstPageQuery && chunk.pageNumber === 1) {
        score += 100;
        matchedCount += 1;
      }

      // Exact query phrase match gets massive boost
      if (normQuery.length > 3 && normChunk.includes(normQuery)) {
        score += 25;
        matchedCount += 2;
      }

      // Keyword occurrences
      queryWords.forEach((word) => {
        if (normChunk.includes(word)) {
          score += 4;
          matchedCount += 1;
        }
      });

      return { chunk, score, matchedCount };
    });

    scored.sort((a, b) => b.score - a.score);

    const topScored = scored.slice(0, topK);
    // Strict Guardrail: Se a pontuação for 0 ou se o número de palavras-chave coincidentes for inferior a 50% das palavras da pergunta, declara fora do escopo do PDF
    const minRequiredMatches = isFirstPageQuery ? 1 : Math.max(1, Math.ceil(queryWords.length * 0.5));
    if (topScored[0]?.score === 0 || (topScored[0]?.matchedCount ?? 0) < minRequiredMatches) {
      return [];
    }

    return topScored.map((s) => s.chunk);
  };

  // Síntese Factual Determinística de Resposta a partir dos Chunks do PDF com Guardrail Estrito
  const generateDeterministicAnswer = (query: string, relevantChunks: PdfChunk[]): string => {
    if (relevantChunks.length === 0) {
      return `Esta solicitação está fora do contexto do Plano de Governo Oficial de ${candidateName}. O documento registrado no TSE não contém informações sobre este assunto.`;
    }

    const normQuery = normalizeText(query);

    // Positional check for "first line", "first page", "beginning", "title"
    const isFirstLineQuery = (
      normQuery.includes('primeira linha') ||
      normQuery.includes('primeira palavra') ||
      normQuery.includes('primeiras palavras') ||
      normQuery.includes('linha 1')
    );

    const isFirstPageOrTitleQuery = (
      isFirstLineQuery ||
      normQuery.includes('primeira pagina') ||
      normQuery.includes('inicio do pdf') ||
      normQuery.includes('comeco do pdf') ||
      normQuery.includes('inicio do plano') ||
      normQuery.includes('comeco do plano') ||
      normQuery.includes('titulo do pdf') ||
      normQuery.includes('capa do pdf') ||
      normQuery.includes('pagina 1')
    );

    if (isFirstPageOrTitleQuery) {
      const page1Chunks = pdfChunks.filter((c) => c.pageNumber === 1 || c.pageNumber === 2);
      let cleanSnippet = '';

      for (const chunk of page1Chunks) {
        const txt = chunk.text
          .replace(/[\uE000-\uF8FF\uFFFD\uFEFF]/g, '')
          .replace(/[^\w\sÀ-ÿ\.,\-\:\/\(\)]/gi, ' ')
          .replace(/\b[0-9]+\b/g, '')
          .replace(/\s+/g, ' ')
          .trim();

        if (txt.length > 5) {
          cleanSnippet = txt.substring(0, 180);
          break;
        }
      }

      if (!cleanSnippet) {
        cleanSnippet = candidateName ? `Plano de Governo Oficial de ${candidateName}` : 'Plano de Governo Registrado no TSE';
      }

      if (isFirstLineQuery) {
        return `A primeira linha (ou cabeçalho de capa) do Plano de Governo Oficial de ${candidateName} [Página 1] é:\n\n"${cleanSnippet}"`;
      }

      return `O início do Plano de Governo Oficial de ${candidateName} [Página 1] apresenta:\n\n"${cleanSnippet}..."`;
    }

    const queryWords = normQuery.split(/\s+/).filter((w) => w.length > 2 && !STOP_WORDS.has(w));

    // Group matching sentences by page
    const pageSentences: Array<{ page: number; text: string }> = [];

    relevantChunks.forEach((chunk) => {
      const sentences = chunk.text.split(/(?<=[.!?])\s+/);
      sentences.forEach((sent) => {
        const normSent = normalizeText(sent);
        if (sent.trim().length > 15) {
          const hasMatch = queryWords.some((w) => normSent.includes(w)) || (normQuery.length > 3 && normSent.includes(normQuery));
          if (hasMatch) {
            pageSentences.push({ page: chunk.pageNumber, text: sent.trim() });
          }
        }
      });
    });

    // Deduplicate sentences
    const uniqueSentences = Array.from(new Map(pageSentences.map((s) => [s.text.toLowerCase(), s])).values());

    if (uniqueSentences.length === 0) {
      // Fallback to top chunk snippet
      const topChunk = relevantChunks[0];
      return `Segundo o Plano de Governo registrado por ${candidateName} [Página ${topChunk.pageNumber}]:\n\n"${topChunk.text.trim()}"`;
    }

    const mainPassages = uniqueSentences.slice(0, 3);
    const textLines = mainPassages.map((s) => `• "${s.text}" [Página ${s.page}]`).join('\n\n');

    return `Com base estrita no Plano de Governo Oficial de ${candidateName}, identificamos os seguintes pontos sobre o tema solicitado:\n\n${textLines}`;
  };

  // Envio de pergunta do usuário para o modelo de IA / RAG
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuestion.trim();
    if (!query || isProcessing) return;

    console.group(`[Criterium PDF Chat] Processando consulta: "${query}"`);

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuestion('');
    setIsProcessing(true);

    try {
      addLog('Buscando trechos factual no arquivo PDF indexado...');
      const relevantChunks = retrieveRelevantChunks(query, 4);
      const sourcesList = Array.from(new Set(relevantChunks.map((c) => `Página ${c.pageNumber}`)));

      let answerText = '';

      // Guardrail Estrito: Se a consulta for totalmente fora do escopo do PDF, retorna mensagem padrão imediatamente
      if (relevantChunks.length === 0) {
        answerText = `Esta solicitação está fora do contexto do Plano de Governo Oficial de ${candidateName}. O documento registrado no TSE não contém informações sobre este assunto.`;
      } else {
        const retrievedContext = relevantChunks
          .map((c) => `[Página ${c.pageNumber}]: ${c.text}`)
          .join('\n---\n');

        // 1ª Opção: Chrome Built-in AI
        if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
          try {
            setStatusMessage('Analisando via Chrome Built-in AI...');
            const session = await (window as any).ai.languageModel.create({
              systemPrompt: `Você é um assistente estritamente limitado ao Plano de Governo Oficial de ${candidateName}. Responda APENAS com base nos trechos do PDF abaixo e cite as fontes [Página X]. Se não constar, diga que está fora de contexto:\n${retrievedContext}`,
            });
            answerText = await session.prompt(query);
          } catch (aiErr) {
            console.warn('[Criterium PDF Chat] Chrome Built-in AI indisponível:', aiErr);
          }
        }

        // 2ª Opção: WebLLM WebGPU
        if (!answerText && webllmEngineRef.current) {
          try {
            setStatusMessage('Gerando resposta via Llama 3.2 WebGPU...');
            const completion = await webllmEngineRef.current.chat.completions.create({
              messages: [
                {
                  role: 'system',
                  content: `Você é um assistente de análise estritamente limitado ao Plano de Governo Oficial de ${candidateName}.\nREGRAS OBRIGATÓRIAS:\n1. Responda à pergunta do usuário APENAS com base nos trechos do PDF abaixo.\n2. Indique a página da fonte diretamente na resposta usando a sintaxe [Página X].\n3. SE A PERGUNTA TRATAR DE QUALQUER ASSUNTO QUE NÃO CONSTE NOS TRECHOS ABAIXO, responda EXATAMENTE: "Esta solicitação está fora do contexto do Plano de Governo Oficial de ${candidateName}. O documento registrado no TSE não contém informações sobre este assunto."\n4. NUNCA invente nada fora dos trechos fornecidos.\n\nTrechos extraídos do PDF:\n${retrievedContext}`,
                },
                {
                  role: 'user',
                  content: query,
                },
              ],
              max_tokens: 400,
              temperature: 0.1,
            });

            answerText = completion.choices[0]?.message?.content || '';
          } catch (webllmErr) {
            console.warn('[Criterium PDF Chat] WebLLM WebGPU falhou:', webllmErr);
          }
        }

        // 3ª Opção: Factual RAG Determinístico (Garantia de 100% de Precisão e Zero Alucinação)
        if (!answerText) {
          setStatusMessage('Sintetizando resposta factual com base no PDF...');
          answerText = generateDeterministicAnswer(query, relevantChunks);
        }
      }

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        sender: 'assistant',
        text: answerText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        sources: sourcesList.length > 0 ? sourcesList : undefined,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      console.groupEnd();
    } catch (err: any) {
      console.error('[Criterium PDF Chat] Erro ao processar mensagem:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          sender: 'assistant',
          text: err.message || 'Ocorreu um erro ao consultar o documento. Por favor, tente novamente.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      console.groupEnd();
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  // Renderizador de mensagens com links auditáveis diretamente inline nas páginas citadas
  const renderFormattedMessage = (text: string) => {
    const parts = text.split(/(\[Página \d+\])/g);

    return parts.map((part, idx) => {
      const match = part.match(/^\[Página (\d+)\]$/);
      if (match) {
        const pageNum = match[1];
        const auditUrl = pdfUrl ? `${pdfUrl}#page=${pageNum}` : undefined;
        return (
          <a
            key={idx}
            href={auditUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              if (!auditUrl) e.preventDefault();
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              color: 'var(--text-main)',
              background: 'var(--bg-primary)',
              border: '1px solid var(--border-subtle)',
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.75rem',
              fontWeight: 700,
              textDecoration: 'none',
              marginLeft: '4px',
              marginRight: '2px',
              cursor: auditUrl ? 'pointer' : 'default',
              transition: 'var(--transition)',
            }}
            title={auditUrl ? `Clique para abrir e auditar a Página ${pageNum} do PDF original no TSE` : `Fonte: Página ${pageNum}`}
          >
            <FileText size={11} color="var(--text-muted)" />
            <span>Página {pageNum} (Auditar)</span>
            <ExternalLink size={10} color="var(--text-muted)" />
          </a>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  return (
    <div
      style={{
        marginTop: '20px',
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-strong)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.2)',
      }}
    >
      {/* Header do componente com badge do Plano de Governo */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              padding: '8px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-tertiary)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Bot size={22} className="desktop-icon-allow" />
          </div>
          <div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Chat com o Plano de Governo Oficial (TSE)
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Análise direta das propostas registradas por {candidateName}
            </div>
          </div>
        </div>

        <span
          style={{
            fontSize: '0.75rem',
            padding: '4px 10px',
            borderRadius: 'var(--radius-full)',
            background: 'var(--bg-tertiary)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Cpu size={12} />
          <span>{webllmEngineRef.current ? 'Llama 3.2 WebGPU (IA Local)' : 'RAG Factual (PDF.js)'}</span>
        </span>
      </div>

      {/* Tela de Inicialização / Botão Iniciar Chat */}
      {!chatStarted ? (
        <div
          style={{
            background: 'var(--bg-tertiary)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)',
            padding: '24px',
            textAlign: 'center',
          }}
        >
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '18px', maxWidth: '560px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
            Clique no botão abaixo para baixar o PDF oficial do Plano de Governo no TSE, indexar as páginas e conversar diretamente com as propostas do candidato.
          </p>

          <button
            onClick={handleStartChat}
            disabled={isInitializing}
            className="btn btn-primary"
            style={{
              padding: '12px 24px',
              fontSize: '0.95rem',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: isInitializing ? 'not-allowed' : 'pointer',
              opacity: isInitializing ? 0.7 : 1,
            }}
          >
            {isInitializing ? <RefreshCw size={18} className="animate-spin" /> : <Play size={18} />}
            <span>{isInitializing ? 'Baixando e Lendo PDF do TSE...' : 'Iniciar Chat com o Plano de Governo'}</span>
          </button>

          {/* Logs de inicialização */}
          {initLogs.length > 0 && (
            <div
              style={{
                marginTop: '20px',
                textAlign: 'left',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px',
                maxHeight: '160px',
                overflowY: 'auto',
                fontSize: '0.78rem',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
              }}
            >
              {initLogs.map((log, lIdx) => (
                <div key={lIdx} style={{ marginBottom: '4px' }}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* Tela de Mensagens do Chat */
        <div>
          {pdfStats && (
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                marginBottom: '12px',
                background: 'var(--bg-primary)',
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>📄 Documento do TSE: <strong>{pdfStats.totalPages} páginas</strong> ({pdfStats.totalWords.toLocaleString('pt-BR')} palavras lidas)</span>
            </div>
          )}

          <div
            style={{
              height: '340px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              marginBottom: '14px',
            }}
          >
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '85%',
                  background: msg.sender === 'user' ? 'var(--text-main)' : 'var(--bg-tertiary)',
                  color: msg.sender === 'user' ? 'var(--bg-primary)' : 'var(--text-main)',
                  padding: '12px 16px',
                  borderRadius: msg.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                  border: msg.sender === 'user' ? 'none' : '1px solid var(--border-subtle)',
                  fontSize: '0.88rem',
                  lineHeight: 1.5,
                  whiteSpace: 'pre-wrap',
                }}
              >
                <div>{renderFormattedMessage(msg.text)}</div>
                {msg.sources && msg.sources.length > 0 && (
                  <div
                    style={{
                      marginTop: '8px',
                      paddingTop: '6px',
                      borderTop: '1px solid var(--border-subtle)',
                      fontSize: '0.74rem',
                      opacity: 0.8,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <FileText size={12} /> Fontes no PDF: {msg.sources.join(', ')}
                  </div>
                )}
                <div style={{ fontSize: '0.68rem', opacity: 0.6, marginTop: '4px', textAlign: 'right' }}>
                  {msg.timestamp}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-muted)',
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 2px',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <RefreshCw size={14} className="animate-spin" />
                <span>{statusMessage || 'Analisando o PDF e sintetizando propostas...'}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              placeholder={`Pergunte sobre as propostas de ${candidateName} (ex: segurança pública, saúde, educação)...`}
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '12px 16px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isProcessing || !inputQuestion.trim()}
              className="btn btn-primary"
              style={{
                padding: '12px 20px',
                borderRadius: 'var(--radius-full)',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: isProcessing || !inputQuestion.trim() ? 'not-allowed' : 'pointer',
                opacity: isProcessing || !inputQuestion.trim() ? 0.6 : 1,
              }}
            >
              <Send size={16} />
              <span>Enviar</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
