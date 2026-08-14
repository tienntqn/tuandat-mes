import api from './axios'

export interface UploadResult {
  url: string // /api/v1/uploads/<file>
  filename: string
  type: 'IMAGE' | 'VIDEO'
  size: number
}

export interface UploadDocumentResult {
  url: string
  filename: string
  mimeType: string
  size: number
}

// Upload 1 file ảnh/video lên server, trả về URL phục vụ tĩnh
export const uploadApi = {
  upload: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<UploadResult>('/uploads', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000, // video có thể lớn
      })
      .then((r) => r.data)
  },

  // Tài liệu hồ sơ máy: ngoài ảnh/video còn nhận PDF, Word, Excel
  uploadDocument: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api
      .post<UploadDocumentResult>('/uploads/document', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      })
      .then((r) => r.data)
  },
}
