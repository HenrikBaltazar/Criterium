import nodemailer from 'nodemailer';
import dns from 'dns';

export interface SendWelcomeEmailOptions {
  to: string;
  name: string;
}

/**
 * Helper to resolve the primary MX host for a given domain
 */
async function getPrimaryMxHost(domain: string): Promise<string | null> {
  try {
    const addresses = await dns.promises.resolveMx(domain);
    if (!addresses || addresses.length === 0) return null;
    // Sort by priority (lowest number = highest priority)
    addresses.sort((a, b) => a.priority - b.priority);
    return addresses[0].exchange;
  } catch (error) {
    console.warn(`[EmailService] Não foi possível resolver MX para ${domain}:`, (error as Error).message);
    return null;
  }
}

/**
 * Send welcome email to newly registered user
 */
export async function sendWelcomeEmail({ to, name }: SendWelcomeEmailOptions): Promise<boolean> {
  try {
    const emailParts = to.split('@');
    if (emailParts.length !== 2) {
      console.warn(`[EmailService] E-mail inválido fornecido: ${to}`);
      return false;
    }
    const domain = emailParts[1];

    let transporter: nodemailer.Transporter;

    // Check if custom SMTP server is configured in environment variables
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = Number(process.env.SMTP_PORT) || 587;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpHost.trim() !== '') {
      // Option A: Configured SMTP Server
      transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
        tls: { rejectUnauthorized: false },
      });
    } else {
      // Option B: Direct MX Delivery to recipient's email server (Autonomous Container Dispatch)
      const mxHost = await getPrimaryMxHost(domain);
      if (!mxHost) {
        console.warn(`[EmailService] Nenhum servidor MX encontrado para o domínio ${domain}. Abortando envio direto.`);
        return false;
      }

      transporter = nodemailer.createTransport({
        host: mxHost,
        port: 25,
        secure: false,
        direct: true,
        name: 'criterium.app',
        tls: { rejectUnauthorized: false },
        connectionTimeout: 8000,
        greetingTimeout: 5000,
      } as any);
    }

    const fromAddress = process.env.EMAIL_FROM || '"Criterium Eleições 2026" <no-reply@criterium.app>';

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bem-vindo ao Criterium</title>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #09090b;
          color: #f4f4f5;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background-color: #18181b;
          border: 1px solid #27272a;
          border-radius: 8px;
          overflow: hidden;
        }
        .header {
          background-color: #000000;
          padding: 24px;
          text-align: center;
          border-bottom: 1px solid #27272a;
        }
        .logo {
          font-size: 24px;
          font-weight: 800;
          letter-spacing: -0.05em;
          color: #ffffff;
          text-transform: uppercase;
        }
        .content {
          padding: 32px 24px;
          line-height: 1.6;
        }
        h1 {
          font-size: 20px;
          font-weight: 700;
          color: #ffffff;
          margin-top: 0;
          margin-bottom: 16px;
        }
        p {
          color: #a1a1aa;
          font-size: 15px;
          margin-bottom: 20px;
        }
        .highlight-box {
          background-color: #09090b;
          border-left: 3px solid #ffffff;
          padding: 16px;
          margin: 24px 0;
          border-radius: 0 4px 4px 0;
        }
        .footer {
          background-color: #09090b;
          padding: 20px 24px;
          text-align: center;
          font-size: 12px;
          color: #71717a;
          border-top: 1px solid #27272a;
        }
        .footer a {
          color: #a1a1aa;
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">CRITERIUM</div>
        </div>
        <div class="content">
          <h1>Olá, ${name}!</h1>
          <p>Sua conta na plataforma <strong>Criterium</strong> foi criada com sucesso.</p>
          <p>Com o Criterium, você tem em mãos uma ferramenta imparcial e factual para analisar candidatos, criar regras de pontuação personalizadas e montar sua colinha eleitoral com total autonomia.</p>
          
          <div class="highlight-box">
            <strong style="color: #ffffff;">E-mail cadastrado:</strong> ${to}<br>
            <span style="font-size: 13px; color: #a1a1aa;">Suas pontuações e configurações são totalmente individuais e privadas.</span>
          </div>

          <p>Acesse o painel para explorar o ranking técnico por cargos e definir suas preferências de avaliação.</p>
        </div>
        <div class="footer">
          <p>© 2026 Criterium — Plataforma de Análise Eleitoral. Desenvolvido por <a href="https://henrik.dev.br" target="_blank">henrik.dev.br</a></p>
        </div>
      </div>
    </body>
    </html>
    `;

    const info = await transporter.sendMail({
      from: fromAddress,
      to,
      subject: 'Bem-vindo ao Criterium - Sua conta foi criada',
      text: `Olá, ${name}!\n\nSua conta na plataforma Criterium foi criada com sucesso (${to}).\n\nAcesse o painel para explorar o ranking técnico por cargos e definir suas preferências de avaliação.\n\n© 2026 Criterium - henrik.dev.br`,
      html: htmlContent,
    });

    console.log(`[EmailService] E-mail de boas-vindas enviado com sucesso para ${to}. MessageId: ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`[EmailService] Erro ao enviar e-mail de boas-vindas para ${to}:`, (error as Error).message);
    return false;
  }
}
