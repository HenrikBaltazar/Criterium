/**
 * Verifica se o navegador possui capacidade de execução de Inteligência Artificial Client-Side
 * através do Chrome Built-in AI (window.ai.languageModel) ou WebLLM acelerado por WebGPU (navigator.gpu).
 */
export function isClientAiAvailable(): boolean {
  if (typeof window !== 'undefined' && (window as any).ai?.languageModel) {
    return true;
  }
  if (typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
    return true;
  }
  return false;
}
