import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { diskStorage } from 'multer'
import { extname, join } from 'path'
import { mkdirSync } from 'fs'
import { randomBytes } from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')
// Tạo sẵn thư mục lưu file (multer cần thư mục tồn tại)
mkdirSync(UPLOAD_DIR, { recursive: true })

const ALLOWED = /^(image|video)\//

// Tài liệu hồ sơ máy (hướng dẫn sử dụng, hóa đơn, hợp đồng, chứng chỉ kiểm định...)
// ngoài ảnh/video còn cho phép PDF, Word, Excel
const ALLOWED_DOC =
  /^(image|video)\/|^application\/(pdf|msword|vnd\.openxmlformats-officedocument\.(wordprocessingml\.document|spreadsheetml\.sheet)|vnd\.ms-excel)$/

// Cấu hình lưu file dùng chung cho các endpoint upload
const diskConfig = diskStorage({
  destination: UPLOAD_DIR,
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${randomBytes(8).toString('hex')}`
    cb(null, `${unique}${extname(file.originalname)}`)
  },
})

@Controller('uploads')
export class UploadsController {
  // Upload 1 file ảnh/video — trả về URL phục vụ tĩnh tại /api/v1/uploads/<file>
  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskConfig,
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB (cho cả video)
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED.test(file.mimetype)) {
          cb(new BadRequestException('Chỉ chấp nhận ảnh hoặc video'), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Không có file được tải lên')
    return {
      url: `/api/v1/uploads/${file.filename}`,
      filename: file.originalname,
      type: file.mimetype.startsWith('video/') ? 'VIDEO' : 'IMAGE',
      size: file.size,
    }
  }

  // Upload tài liệu hồ sơ máy — nhận thêm PDF/Word/Excel ngoài ảnh, video
  @Post('document')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskConfig,
      limits: { fileSize: 50 * 1024 * 1024 },
      fileFilter: (_req, file, cb) => {
        if (!ALLOWED_DOC.test(file.mimetype)) {
          cb(new BadRequestException('Chỉ chấp nhận ảnh, video, PDF, Word hoặc Excel'), false)
          return
        }
        cb(null, true)
      },
    }),
  )
  uploadDocument(@UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Không có file được tải lên')
    return {
      url: `/api/v1/uploads/${file.filename}`,
      filename: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
    }
  }
}
