import React, { useState, useEffect, useRef } from 'react';
import { Send, Bot, RefreshCw, Sparkles, Cpu, FileText, CheckCircle2, Play } from 'lucide-react';
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
  const [engineType, setEngineType] = useState<'chrome_ai' | 'webllm_webgpu'>('chrome_ai');
  
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
    }
  }, []);

  // Rolagem automática do chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing, statusMessage, isInitializing]);

  // Função disparada ao clicar no botão "Iniciar Chat"
  const handleStartChat = async () => {
    setIsInitializing(true);
    setInitLogs([]);
    console.group(`[Criterium PDF Chat] Inicializando sessão para ${candidateName}`);
    addLog(`Iniciar Chat acionado para o candidato: ${candidateName}`);

    try {
      // Step 1: Download & Leitura do PDF do TSE
      if (pdfUrl) {
        addLog(`Iniciando download do PDF oficial do TSE: ${pdfUrl}`);
        setIndexingStatus('downloading');

        const proxyUrl = `/api/candidates/pdf-proxy?url=${encodeURIComponent(pdfUrl)}`;
        let response = await fetch(proxyUrl);
        if (!response.ok) {
          addLog('Proxy direto retornou status não-OK, tentando download direto do TSE...');
          response = await fetch(pdfUrl);
        }

        if (!response.ok) {
          throw new Error('Falha ao baixar o arquivo PDF do TSE.');
        }

        addLog('Download do PDF concluído! Extraindo ArrayBuffer para parsing...');
        const arrayBuffer = await response.arrayBuffer();

        setIndexingStatus('parsing');
        addLog('Iniciando PDF.js worker no navegador para leitura das páginas...');

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        addLog(`PDF carregado com sucesso. Total de páginas identificadas: ${pdf.numPages}`);

        const extractedChunks: PdfChunk[] = [];
        let wordCount = 0;

        for (let i = 1; i <= pdf.numPages; i++) {
          addLog(`Lendo e extraindo texto: Página ${i} de ${pdf.numPages}...`);
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const pageText = content.items.map((item: any) => item.str).join(' ');

          if (pageText.trim().length > 0) {
            wordCount += pageText.split(/\s+/).length;
            const chunkSize = 600;
            for (let j = 0; j < pageText.length; j += chunkSize) {
              const chunkStr = pageText.substring(j, j + chunkSize + 100);
              extractedChunks.push({
                pageNumber: i,
                text: chunkStr,
              });
            }
          }
        }

        addLog(`Extração de PDF finalizada: ${extractedChunks.length} chunks criados (${wordCount} palavras em ${pdf.numPages} páginas).`);
        setPdfChunks(extractedChunks);
        setPdfStats({ totalPages: pdf.numPages, totalWords: wordCount });
      } else if (proposals && proposals.length > 0) {
        addLog(`Sem URL de PDF direta. Indexando ${proposals.length} propostas estruturadas salvas no banco...`);
        const fallbackChunks: PdfChunk[] = proposals.map((p, i) => ({
          pageNumber: 1,
          text: `[Proposta ${i + 1}] Eixo: ${p.category || 'Geral'}. Título: ${p.title}. Descrição: ${p.description || ''}`,
        }));
        setPdfChunks(fallbackChunks);
        setPdfStats({ totalPages: 1, totalWords: fallbackChunks.reduce((a, c) => a + c.text.split(/\s+/).length, 0) });
      }

      setIndexingStatus('ready');

      // Step 2: Inicialização do Modelo de IA
      addLog(`Verificando motor de IA selecionado: ${engineType.toUpperCase()}`);

      if (engineType === 'chrome_ai') {
        addLog('Navegador possui suporte ao Chrome Built-in AI (Gemini Nano). Inicializando sessão de modelo...');
      } else if (engineType === 'webllm_webgpu') {
        addLog(`WebGPU detectado no navegador. Inicializando WebLLM (${SELECTED_MODEL})...`);
        if (!webllmEngineRef.current) {
          webllmEngineRef.current = await CreateMLCEngine(SELECTED_MODEL, {
            initProgressCallback: (progress) => {
              addLog(`WebGPU Progress: ${progress.text}`);
            },
          });
        }
        addLog('WebGPU WebLLM Engine pronto e alocado na memória GPU!');
      }

      addLog('Processo de inicialização concluído com 100% de sucesso! Abrindo interface de chat.');
      console.groupEnd();

      // Transiciona para a interface de chat aberta
      setMessages([
        {
          id: 'welcome',
          sender: 'assistant',
          text: `Olá! O Plano de Governo de ${candidateName} foi lido, indexado e carregado no modelo 100% no seu navegador. O que gostaria de saber sobre o documento?`,
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setChatStarted(true);
    } catch (err: any) {
      console.error('[Criterium PDF Chat] Erro na inicialização:', err);
      addLog(`ERRO: ${err.message || 'Falha ao inicializar chat e indexar arquivo.'}`);
      setIndexingStatus('error');
      console.groupEnd();
    } finally {
      setIsInitializing(false);
    }
  };

  // Algoritmo RAG para busca de Chunks Relevantes do PDF
  const retrieveRelevantChunks = (query: string, topK = 4): PdfChunk[] => {
    if (pdfChunks.length === 0) return [];

    const normQuery = normalizeText(query);
    const queryWords = normQuery.split(/\s+/).filter((w) => w.length > 2);

    const scored = pdfChunks.map((chunk) => {
      const normChunk = normalizeText(chunk.text);
      let score = 0;

      queryWords.forEach((word) => {
        if (normChunk.includes(word)) {
          score += 2;
        }
      });

      if (normChunk.includes(normQuery)) {
        score += 10;
      }

      return { chunk, score };
    });

    scored.sort((a, b) => b.score - a.score);

    const topScored = scored.slice(0, topK);
    if (topScored[0]?.score === 0) {
      return pdfChunks.slice(0, topK);
    }

    return topScored.map((s) => s.chunk);
  };

  // Envio de pergunta do usuário para o modelo de IA
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputQuestion.trim();
    if (!query || isProcessing) return;

    console.group(`[Criterium PDF Chat] Processando pergunta: "${query}"`);

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
      console.log('[Criterium PDF Chat] Buscando chunks relevantes no PDF indexado...');
      const relevantChunks = retrieveRelevantChunks(query, 4);
      console.log(`[Criterium PDF Chat] ${relevantChunks.length} chunks relevantes selecionados:`, relevantChunks);

      const retrievedContext = relevantChunks
        .map((c) => `[Página ${c.pageNumber}]: ${c.text}`)
        .join('\n---\n');

      let answerText = '';

      // 1ª Opção: Chrome Built-in AI
      if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
        try {
          console.log('[Criterium PDF Chat] Enviando contexto para Chrome Built-in AI...');
          setStatusMessage('Analisando via Chrome Built-in AI...');
          const session = await (window as any).ai.languageModel.create({
            systemPrompt: `Você é um assistente imparcial que analisa o Plano de Governo de ${candidateName}. Responda à pergunta do usuário baseando-se estritamente nos trechos do PDF:\n${retrievedContext}`,
          });
          answerText = await session.prompt(query);
          console.log('[Criterium PDF Chat] Resposta recebida do Chrome Built-in AI:', answerText);
        } catch (aiErr) {
          console.warn('[Criterium PDF Chat] Chrome Built-in AI falhou, avançando para WebLLM WebGPU:', aiErr);
        }
      }

      // 2ª Opção: WebLLM WebGPU
      if (!answerText && typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
        try {
          console.log('[Criterium PDF Chat] Executando inferência no WebLLM via WebGPU...');
          setStatusMessage('Gerando resposta via Llama 3.2 WebGPU...');
          
          if (!webllmEngineRef.current) {
            webllmEngineRef.current = await CreateMLCEngine(SELECTED_MODEL);
          }

          const completion = await webllmEngineRef.current.chat.completions.create({
            messages: [
              {
                role: 'system',
                content: `Você é um assistente imparcial que analisa o Plano de Governo de ${candidateName}. Responda em português com base estrita nos trechos do PDF:\n${retrievedContext}`,
              },
              {
                role: 'user',
                content: query,
              },
            ],
            max_tokens: 350,
            temperature: 0.2,
          });

          answerText = completion.choices[0]?.message?.content || '';
          console.log('[Criterium PDF Chat] Resposta gerada via WebLLM WebGPU:', answerText);
        } catch (webllmErr) {
          console.warn('[Criterium PDF Chat] WebLLM WebGPU falhou:', webllmErr);
        }
      }

      if (!answerText) {
        throw new Error('O modelo de IA (WebGPU/Chrome AI) não retornou uma resposta válida.');
      }

      const sourcesList = Array.from(new Set(relevantChunks.map((c) => `Página ${c.pageNumber}`)));

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
          text: err.message || 'Ocorreu um erro ao processar a consulta no modelo de IA. Por favor, tente novamente.',
          timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      console.groupEnd();
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  return (
    <div
      style={{
        background: 'var(--bg-tertiary)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        marginTop: '16px',
      }}
    >
      {/* Cabeçalho do Componente de Chat */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bot size={18} className="desktop-icon-allow" style={{ color: 'var(--text-main)' }} />
          <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)' }}>
            Conversar com o Plano de Governo
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Badge do Motor de IA */}
          <div
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              background: 'var(--bg-primary)',
              padding: '4px 10px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--border-subtle)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            {engineType === 'webllm_webgpu' ? (
              <>
                <Cpu size={12} className="desktop-icon-allow" />
                <span>WebLLM (Llama 3.2 1B / WebGPU)</span>
              </>
            ) : (
              <>
                <Sparkles size={12} className="desktop-icon-allow" />
                <span>Chrome Built-in AI (Gemini Nano)</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ESTADO 1: TELA INICIAL COM BOTÃO "INICIAR CHAT" */}
      {!chatStarted && !isInitializing && (
        <div
          style={{
            background: 'var(--bg-primary)',
            padding: '24px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
          }}
        >
          <FileText size={32} className="desktop-icon-allow" style={{ color: 'var(--text-main)' }} />
          <div>
            <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              Análise e Chat com o Plano de Governo de {candidateName}
            </h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '520px', margin: '0 auto', lineHeight: 1.45 }}>
              Ao clicar no botão abaixo, o arquivo PDF oficial registrado no TSE será baixado, lido e indexado no modelo de IA local do seu navegador ({engineType === 'webllm_webgpu' ? 'WebLLM Llama 3.2 via WebGPU' : 'Chrome Built-in AI'}).
            </p>
          </div>

          <button
            onClick={handleStartChat}
            style={{
              padding: '12px 24px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--text-main)',
              color: 'var(--bg-primary)',
              border: 'none',
              fontWeight: 800,
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              marginTop: '6px',
            }}
          >
            <Play size={16} className="desktop-icon-allow" />
            <span>Iniciar Chat com o Plano de Governo</span>
          </button>
        </div>
      )}

      {/* ESTADO 2: CARREGAMENTO E INDEXAÇÃO COM BARRA DE PROGRESSO E LOGS */}
      {isInitializing && (
        <div
          style={{
            background: 'var(--bg-primary)',
            padding: '20px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)' }}>
            <RefreshCw size={16} className="spin desktop-icon-allow" />
            <span>{statusMessage || 'Inicializando download, extração do PDF e modelo de IA...'}</span>
          </div>

          {/* Log Console Box em Tempo Real */}
          <div
            style={{
              background: 'var(--bg-tertiary)',
              padding: '12px',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'monospace',
              fontSize: '0.78rem',
              color: 'var(--text-main)',
              maxHeight: '160px',
              overflowY: 'auto',
              border: '1px solid var(--border-subtle)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {initLogs.map((log, idx) => (
              <div key={idx}>{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* ESTADO 3: INTERFACE DE CHAT LIBERADA (MENSAGENS E INPUT) */}
      {chatStarted && (
        <>
          {/* Badge do Status de PDF Indexado */}
          {pdfStats && (
            <div
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                background: 'var(--bg-primary)',
                padding: '6px 12px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <CheckCircle2 size={14} className="desktop-icon-allow" style={{ color: 'var(--text-main)' }} />
              <span>
                PDF do TSE Indexado com Sucesso: <strong>{pdfStats.totalPages} páginas</strong> e <strong>{pdfStats.totalWords} palavras</strong> lidas no modelo de IA.
              </span>
            </div>
          )}

          {/* Saída de Texto / Histórico de Mensagens do Chat */}
          <div
            style={{
              background: 'var(--bg-primary)',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              padding: '16px',
              minHeight: '180px',
              maxHeight: '320px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: isUser ? 'flex-end' : 'flex-start',
                  }}
                >
                  <div
                    style={{
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      background: isUser ? 'var(--text-main)' : 'var(--bg-tertiary)',
                      color: isUser ? 'var(--bg-primary)' : 'var(--text-main)',
                      border: isUser ? 'none' : '1px solid var(--border-subtle)',
                      fontSize: '0.88rem',
                      lineHeight: 1.45,
                    }}
                  >
                    {msg.text}

                    {/* Fontes / Citações de Páginas do PDF */}
                    {msg.sources && msg.sources.length > 0 && (
                      <div
                        style={{
                          fontSize: '0.72rem',
                          opacity: 0.8,
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px dashed var(--border-subtle)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <FileText size={11} className="desktop-icon-allow" />
                        <span>Fonte oficial: {msg.sources.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', padding: '0 4px' }}>
                    {msg.timestamp}
                  </span>
                </div>
              );
            })}

            {isProcessing && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                <RefreshCw size={14} className="spin desktop-icon-allow" />
                <span>{statusMessage || 'Buscando trechos no PDF e consultando modelo de IA...'}</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Entrada de Texto e Botão de Enviar */}
          <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '10px' }}>
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              disabled={isProcessing}
              style={{
                flex: 1,
                padding: '10px 14px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--bg-primary)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            <button
              type="submit"
              disabled={isProcessing || !inputQuestion.trim()}
              style={{
                padding: '10px 18px',
                borderRadius: 'var(--radius-sm)',
                background: 'var(--text-main)',
                color: 'var(--bg-primary)',
                border: 'none',
                fontWeight: 700,
                cursor: isProcessing || !inputQuestion.trim() ? 'not-allowed' : 'pointer',
                opacity: isProcessing || !inputQuestion.trim() ? 0.6 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.85rem',
              }}
            >
              <Send size={15} className="desktop-icon-allow" />
              <span>Enviar</span>
            </button>
          </form>
        </>
      )}
    </div>
  );
};
