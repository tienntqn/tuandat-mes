import { NestFactory, Reflector } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { join } from 'path'
import { AppModule } from './app.module'
import { AppValidationPipe } from './common/pipes/app-validation.pipe'

async function bootstrap() {
  // bodyParser mặc định của Express giới hạn 100kb — quá nhỏ cho payload xếp container
  // (kết quả tính toán có thể chứa hàng nghìn thùng đã xếp tọa độ), gây lỗi
  // "PayloadTooLargeError: request entity too large" khi lưu. Tắt bodyParser mặc định
  // để tự đăng ký lại với giới hạn lớn hơn.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false })
  app.useBodyParser('json', { limit: '15mb' })
  app.useBodyParser('urlencoded', { extended: true, limit: '15mb' })

  app.setGlobalPrefix('api/v1')

  // Phục vụ file upload (ảnh/video máy móc) — nginx đã proxy /api/* sang API
  const uploadDir = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads')
  app.useStaticAssets(uploadDir, { prefix: '/api/v1/uploads/' })

  app.useGlobalPipes(
    new AppValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') ?? ['http://localhost:5173'],
    credentials: true,
  })

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Tuấn Đạt MES API')
      .setDescription('Manufacturing Execution System API')
      .setVersion('1.0')
      .addBearerAuth()
      .build()
    const document = SwaggerModule.createDocument(app, config)
    SwaggerModule.setup('api/docs', app, document)
    console.log(`📖 Swagger: http://localhost:${process.env.PORT ?? 3000}/api/docs`)
  }

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  console.log(`🚀 API: http://localhost:${port}/api/v1`)
}

bootstrap()
