import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as ejs from 'ejs';
import * as path from 'path';
import { promisify } from 'util';

const renderFile = promisify(
  ejs.renderFile as (
    path: string,
    data: any,
    callback: (err: any, str: string) => void,
  ) => void,
);

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly configService: ConfigService) {
    const port = Number(this.configService.get<string>('SMTP_PORT')) || 587;

    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: port,
      secure: port === 465,
      requireTLS: port === 587,
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      tls: {
        rejectUnauthorized: false, // Useful for self-signed certificates or mail server issues
        minVersion: 'TLSv1.2',
      },
      connectionTimeout: 60000,
      greetingTimeout: 60000,
      socketTimeout: 60000,
    });

    if (this.configService.get<string>('NODE_ENV') !== 'test') {
      this.transporter.verify((error) => {
        if (error) {
          console.error('SMTP Connection Error:', error);
        } else {
          console.log('SMTP Server is ready to take our messages');
        }
      });
    }
  }

  async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: any,
  ): Promise<void> {
    try {
      const templatePath = path.join(__dirname, 'templates', `${template}.ejs`);
      const html = await renderFile(templatePath, context);

      await this.transporter.sendMail({
        from: this.configService.get<string>('SMTP_USER'),
        to,
        subject,
        html,
      });
    } catch (error) {
      console.error('Email sending failed:', error);
      throw new InternalServerErrorException('Could not send email');
    }
  }
}
