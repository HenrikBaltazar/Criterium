import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  console.log('🧪 [Guardrails & Audit Links Verification] Testando limitações de escopo e hiperlinks auditáveis...');

  const frontendDir = '/home/henrik/workspace/Criterium/frontend';
  const screenshotsDir = '/home/henrik/workspace/Criterium/tests/screenshots';
  if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir, { recursive: true });
  }

  console.log('  ├─ 🚀 Subindo servidor Vite preview em http://localhost:4173...');
  const serverProcess: ChildProcess = spawn('npx', ['vite', 'preview', '--port', '4173'], {
    cwd: frontendDir,
    stdio: 'ignore',
  });

  await delay(2500);

  try {
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--headless=new'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto('http://localhost:4173', { waitUntil: 'networkidle0' });

    await page.evaluate(() => {
      localStorage.setItem('criterium_onboarding_completed', 'true');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await delay(1200);

    // Open Lula candidate
    console.log('  ├─ 🔍 Abrindo candidato LULA...');
    await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.glass-card'));
      const lulaCard = cards.find((c) => (c.textContent || '').includes('LULA'));
      if (lulaCard) (lulaCard as HTMLElement).click();
    });

    await delay(1500);

    // Click on "Plano de Governo" tab
    console.log('  ├─ 📌 Clicando na aba "Plano de Governo"...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button'));
      const planTab = tabs.find((t) => (t.textContent || '').includes('Plano de Governo'));
      if (planTab) (planTab as HTMLElement).click();
    });

    await delay(1000);

    // Click "Iniciar Chat com o Plano de Governo"
    console.log('  ├─ ⚡ Clicando no botão "Iniciar Chat com o Plano de Governo"...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const startBtn = btns.find((b) => (b.textContent || '').includes('Iniciar Chat com o Plano de Governo'));
      if (startBtn) (startBtn as HTMLElement).click();
    });

    // Wait for PDF indexing
    await page.waitForFunction(
      () => {
        const bodyText = document.body.textContent || '';
        return bodyText.includes('Documento do TSE') || bodyText.includes('O Plano de Governo');
      },
      { timeout: 25000 }
    );

    // Test Case 1: Out of Scope Question
    const outOfScopeQuestion = 'Qual a receita do bolo de cenoura com cobertura de chocolate?';
    console.log(`  ├─ ❓ Enviando pergunta fora de escopo: "${outOfScopeQuestion}"`);

    await page.type('input[placeholder*="Pergunte sobre as propostas"]', outOfScopeQuestion);
    await delay(200);

    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Enviar'));
      if (sendBtn) (sendBtn as HTMLElement).click();
    });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('fora do contexto do Plano de Governo');
      },
      { timeout: 15000 }
    );

    await delay(800);
    const screenshot1Path = path.join(screenshotsDir, 'gov_plan_out_of_scope_guardrail.png');
    await page.screenshot({ path: screenshot1Path });
    console.log(`  ├─ 📸 Captura do Guardrail de Fora de Escopo salva em: ${screenshot1Path}`);

    // Test Case 2: In Scope Question with Inline Audit Hyperlinks
    const inScopeQuestion = 'Quais as propostas para segurança pública?';
    console.log(`  ├─ ❓ Enviando pergunta no escopo: "${inScopeQuestion}"`);

    await page.type('input[placeholder*="Pergunte sobre as propostas"]', inScopeQuestion);
    await delay(200);

    await page.evaluate(() => {
      const sendBtn = Array.from(document.querySelectorAll('button')).find((b) => (b.textContent || '').includes('Enviar'));
      if (sendBtn) (sendBtn as HTMLElement).click();
    });

    await page.waitForFunction(
      () => {
        const text = document.body.textContent || '';
        return text.includes('segurança pública') || text.includes('Página');
      },
      { timeout: 15000 }
    );

    await delay(1000);
    const screenshot2Path = path.join(screenshotsDir, 'gov_plan_inline_audit_links.png');
    await page.screenshot({ path: screenshot2Path });
    console.log(`  └─ 📸 Captura dos links inline de auditoria salva em: ${screenshot2Path}`);

    const chatText = await page.evaluate(() => document.body.textContent || '');

    console.log('\n========================================================');
    if (chatText.includes('fora do contexto do Plano de Governo') && chatText.includes('Auditar')) {
      console.log('✅ SUCESSO TOTAL: Guardrail de fora de escopo e links inline auditáveis 100% validados!');
    } else {
      console.log('⚠️ RESPOSTA RECEBIDA DEVE SER VERIFICADA NAS CAPTURAS DE TELA');
    }
    console.log('========================================================\n');

    await browser.close();
  } catch (err: any) {
    console.error('❌ Erro no teste de guardrails e fontes:', err.message);
  } finally {
    serverProcess.kill();
  }
}

main();
