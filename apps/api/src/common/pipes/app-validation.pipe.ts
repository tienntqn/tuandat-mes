import { ArgumentMetadata, ValidationPipe, ValidationPipeOptions } from '@nestjs/common'

/**
 * ValidationPipe tùy biến cho toàn hệ thống.
 *
 * VẤN ĐỀ: Global ValidationPipe bật `transform: true` sẽ tự convert query/param
 * có kiểu `number` (vd `?pageSize=200`) từ chuỗi "200" -> number 200 NGAY TRƯỚC khi
 * `ParseIntPipe` ở từng tham số chạy. Ở một số phiên bản @nestjs/common, `ParseIntPipe`
 * chỉ chấp nhận CHUỖI số nên khi nhận vào number nó ném:
 *   "Validation failed (numeric string is expected)" -> HTTP 400
 * Hậu quả: TẤT CẢ endpoint danh sách (factories, production-lines, users, styles,
 * plans, machines...) đều trả 400.
 *
 * GIẢI PHÁP: Bỏ qua việc tự convert primitive kiểu Number, để `ParseIntPipe` nhận
 * lại chuỗi gốc và tự parse như thiết kế (đồng thời vẫn validate giá trị không hợp lệ).
 * Các primitive khác (vd Boolean) và toàn bộ DTO (body) vẫn transform/validate bình thường.
 */
export class AppValidationPipe extends ValidationPipe {
  constructor(options?: ValidationPipeOptions) {
    super(options)
  }

  protected transformPrimitive(value: any, metadata: ArgumentMetadata) {
    // Không tự convert Number — nhường cho ParseIntPipe để tránh xung đột nói trên.
    if (metadata.metatype === Number) {
      return value
    }
    return super.transformPrimitive(value, metadata)
  }
}
