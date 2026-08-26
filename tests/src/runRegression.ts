import fs from 'fs';
import path from 'path';
import { runScoreEngineTests } from './scoreEngine.test';
import { runUIValidationTests } from './uiValidation.test';
import { captureUIScreenshots } from './screenshotCapture';

async function runRegressionSuite() {
  console.log('🧪 ========================================================');
  console.log('🧪  SUÍTE DE TESTES DE REGRESSÃO E VALIDAÇÃO DE UI        ');
  console.log('🧪  PLATAFORMA CRITERIUM - SISTEMA ELEITORAL FACTUAL      ');
  console.log('🧪 ========================================================\n');

  const tests = [
    ...runScoreEngineTests(),
    ...runUIValidationTests(),
  ];

  let passedCount = 0;
  let failedCount = 0;
  const reportLines: string[] = [];

  reportLines.push('# Relatório de Execução de Testes Automatizados e Validação de UI - Criterium');
  reportLines.push('');
  reportLines.push(`**Data de Execução:** ${new Date().toLocaleString('pt-BR')}`);
  reportLines.push('');
  reportLines.push('## Resumo de Resultados');
  reportLines.push('');
  reportLines.push('| Status | Suíte / Teste | Detalhes / Saída |');
  reportLines.push('| :--- | :--- | :--- |');

  for (const t of tests) {
    if (t.passed) {
      passedCount++;
      console.log(`✅ PASSED: ${t.name}`);
      if (t.message) console.log(`   └─ ${t.message}`);
      reportLines.push(`| 🟢 PASSED | ${t.name} | ${t.message || 'Ok'} |`);
    } else {
      failedCount++;
      console.log(`❌ FAILED: ${t.name}`);
      if (t.message) console.log(`   └─ ERRO: ${t.message}`);
      reportLines.push(`| 🔴 FAILED | ${t.name} | ERRO: ${t.message} |`);
    }
  }

  // Capture UI Screenshots
  let screenshots: { name: string; path: string }[] = [];
  try {
    screenshots = await captureUIScreenshots();
  } catch (err: any) {
    console.warn('⚠️ Não foi possível capturar screenshots no ambiente atual:', err.message);
  }

  if (screenshots.length > 0) {
    reportLines.push('');
    reportLines.push('## 📸 Evidências Visuais de Interface (Captura Automatizada de UI)');
    reportLines.push('');
    for (const sc of screenshots) {
      reportLines.push(`### ${sc.name}`);
      reportLines.push(`![${sc.name}](${sc.path})`);
      reportLines.push('');
    }
  }

  console.log('\n📊 --------------------------------------------------------');
  console.log(`📊  RESULTADO FINAL: ${passedCount} aprovados, ${failedCount} falhas`);
  if (screenshots.length > 0) {
    console.log(`📸  EVIDÊNCIAS VISUAIS: ${screenshots.length} screenshots capturadas`);
  }
  console.log('📊 --------------------------------------------------------\n');

  reportLines.push('');
  reportLines.push('---');
  reportLines.push(`### Status Final: **${failedCount === 0 ? '100% APROVADO (SUCESSO)' : 'COM FALHAS'}**`);
  reportLines.push(`- **Total de Testes:** ${tests.length}`);
  reportLines.push(`- **Testes Aprovados:** ${passedCount}`);
  reportLines.push(`- **Falhas:** ${failedCount}`);
  reportLines.push(`- **Screenshots Capturadas:** ${screenshots.length}`);

  // Write report artifact
  const artifactDir = '/home/henrik/.gemini/antigravity/brain/7fade8cb-e0d0-48a3-ae01-01f46042bbf3';
  if (fs.existsSync(artifactDir)) {
    fs.writeFileSync(path.join(artifactDir, 'test_report.md'), reportLines.join('\n'), 'utf-8');
    console.log(`📄 Relatório de testes gerado em: ${path.join(artifactDir, 'test_report.md')}`);
  }

  if (failedCount > 0) {
    process.exit(1);
  }
}

runRegressionSuite();
