import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as nodemailer from 'nodemailer'

export interface SendMailInput {
  to: string
  subject: string
  html: string
}

// Gửi email dùng chung cho toàn hệ thống (hiện dùng cho module Kế toán gửi phiếu lương).
// Transporter được tạo lười (lazy) và cache lại, vì SMTP_* có thể chưa cấu hình lúc app khởi động.
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name)
  private transporter: nodemailer.Transporter | null = null

  constructor(private config: ConfigService) {}

  private getTransporter(): nodemailer.Transporter {
    const host = this.config.get<string>('SMTP_HOST')
    if (!host) {
      throw new Error('Chưa cấu hình SMTP (thiếu SMTP_HOST trong .env) — không thể gửi email')
    }
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host,
        port: this.config.get<number>('SMTP_PORT') ?? 587,
        secure: this.config.get<string>('SMTP_SECURE') === 'true',
        auth: this.config.get<string>('SMTP_USER')
          ? {
              user: this.config.get<string>('SMTP_USER'),
              pass: this.config.get<string>('SMTP_PASS'),
            }
          : undefined,
      })
    }
    return this.transporter
  }

  async sendMail(input: SendMailInput): Promise<void> {
    const from = this.config.get<string>('SMTP_FROM') ?? 'no-reply@tuandat.com.vn'
    try {
      await this.getTransporter().sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
      })
    } catch (err) {
      this.logger.error(`Gửi email tới ${input.to} thất bại: ${(err as Error).message}`)
      throw err
    }
  }
}
