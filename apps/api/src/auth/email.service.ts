import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host:   config.get<string>('SMTP_HOST', 'smtp.gmail.com'),
      port:   config.get<number>('SMTP_PORT', 587),
      secure: false,
      auth: {
        user: config.get<string>('SMTP_USER', ''),
        pass: config.get<string>('SMTP_PASS', ''),
      },
    });
  }

  async sendPasswordResetCode(to: string, name: string, code: string) {
    try {
      await this.transporter.sendMail({
        from:    `"AlmoxPert IFBA" <${this.config.get('SMTP_USER', 'no-reply@ifba.edu.br')}>`,
        to,
        subject: 'Código de Redefinição de Senha – AlmoxPert',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#1d4ed8">AlmoxPert IFBA</h2>
            <p>Olá, <strong>${name}</strong>.</p>
            <p>Recebemos uma solicitação de redefinição de senha. Use o código abaixo:</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;text-align:center;
                        padding:16px;background:#f1f5f9;border-radius:8px;margin:24px 0">
              ${code}
            </div>
            <p>O código expira em <strong>15 minutos</strong>.</p>
            <p>Se você não solicitou a redefinição, ignore este e-mail.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send password reset email', err);
    }
  }

  async sendPasswordResetConfirmation(to: string, name: string, defaultPassword: string) {
    try {
      await this.transporter.sendMail({
        from:    `"AlmoxPert IFBA" <${this.config.get('SMTP_USER', 'no-reply@ifba.edu.br')}>`,
        to,
        subject: 'Senha Redefinida – AlmoxPert',
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#1d4ed8">AlmoxPert IFBA</h2>
            <p>Olá, <strong>${name}</strong>.</p>
            <p>Sua senha foi redefinida para o padrão:</p>
            <div style="font-size:18px;font-weight:bold;text-align:center;
                        padding:12px;background:#f1f5f9;border-radius:8px;margin:24px 0;
                        font-family:monospace">
              ${defaultPassword}
            </div>
            <p>Ao fazer login, você será solicitado a criar uma nova senha.</p>
            <p>Se você não solicitou essa alteração, entre em contato com a administração do sistema.</p>
          </div>
        `,
      });
    } catch (err) {
      this.logger.error('Failed to send password reset confirmation email', err);
    }
  }
}
