import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common'
import { spawnSync } from 'child_process'
import { join } from 'path'
import { existsSync } from 'fs'

@Injectable()
export class SohoConverterService {
  private readonly logger = new Logger(SohoConverterService.name)
  private pythonExecutable: string | null = null

  async convert(fileBuffer: Buffer, factoryName: string): Promise<Buffer> {
    if (!factoryName || !factoryName.trim()) {
      throw new BadRequestException('Vui lòng nhập tên xưởng')
    }

    const scriptPath = join(process.cwd(), 'soho-processor.py')
    if (!existsSync(scriptPath)) {
      this.logger.error(`Không tìm thấy script chuyển đổi: ${scriptPath}`)
      throw new InternalServerErrorException('Không tìm thấy bộ xử lý file SOHO trên server')
    }

    const python = this.getPythonExecutable()
    const result = spawnSync(python, [scriptPath, '--factory-name', factoryName.trim()], {
      input: fileBuffer,
      stdio: ['pipe', 'pipe', 'pipe'],
      maxBuffer: 80 * 1024 * 1024,
      timeout: 120_000,
    })

    if (result.error) {
      this.logger.error('Lỗi khi chạy Python', result.error)
      if ((result.error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new InternalServerErrorException('Không tìm thấy Python. Vui lòng cài đặt Python 3 và openpyxl hoặc cấu hình PYTHON_EXECUTABLE.')
      }
      throw new InternalServerErrorException('Lỗi khi chuyển đổi file SOHO')
    }

    if (result.status !== 0) {
      const stderr = result.stderr instanceof Buffer ? result.stderr.toString('utf8') : String(result.stderr ?? '')
      this.logger.error(`Python trả về status ${result.status}: ${stderr}`)
      throw new BadRequestException(`Chuyển đổi thất bại: ${stderr || 'Không thể xử lý file'}`)
    }

    if (!result.stdout || result.stdout.length === 0) {
      this.logger.error('Python không trả về dữ liệu đầu ra')
      throw new InternalServerErrorException('Chuyển đổi không tạo ra file đầu ra')
    }

    return Buffer.from(result.stdout)
  }

  private getPythonExecutable(): string {
    if (this.pythonExecutable) return this.pythonExecutable

    const candidates = [process.env.PYTHON_EXECUTABLE, 'python3', 'python'].filter(Boolean) as string[]
    for (const exe of candidates) {
      try {
        const result = spawnSync(exe, ['--version'], { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', timeout: 5000 })
        if (result.status === 0) {
          const output = `${result.stdout ?? ''}${result.stderr ?? ''}`
          if (/Python\s+3\./.test(output)) {
            this.pythonExecutable = exe
            return exe
          }
        }
      } catch (error) {
        this.logger.debug(`Không thể chạy ${exe}: ${error}`)
      }
    }

    throw new InternalServerErrorException('Không tìm thấy Python 3 trên server. Vui lòng cài đặt Python 3 và openpyxl hoặc cấu hình PYTHON_EXECUTABLE.')
  }
}
