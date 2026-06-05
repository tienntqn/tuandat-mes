import { useRef, useState } from 'react'
import { Upload, X, Loader2, Film } from 'lucide-react'
import { uploadApi } from '@/lib/upload'
import { useToast } from '@/components/ui/use-toast'

export interface UploadedFile {
  url: string
  type: 'IMAGE' | 'VIDEO'
  filename?: string
}

interface Props {
  value: UploadedFile[]
  onChange: (files: UploadedFile[]) => void
  // 'image' = chỉ ảnh; 'media' = ảnh + video
  accept?: 'image' | 'media'
  max?: number
  disabled?: boolean
  label?: string
}

// Component upload ảnh/video dùng chung: tải lên server, hiển thị preview, cho xóa.
export function FileUpload({ value, onChange, accept = 'image', max = 8, disabled, label }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const { toast } = useToast()

  const acceptAttr = accept === 'media' ? 'image/*,video/*' : 'image/*'

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const remaining = max - value.length
    const picked = Array.from(files).slice(0, remaining)
    setUploading(true)
    try {
      const results: UploadedFile[] = []
      for (const f of picked) {
        const res = await uploadApi.upload(f)
        results.push({ url: res.url, type: res.type, filename: res.filename })
      }
      onChange([...value, ...results])
    } catch (err: any) {
      toast({
        title: 'Lỗi tải lên',
        description: err?.response?.data?.message || 'Không thể tải file lên',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const removeAt = (idx: number) => onChange(value.filter((_, i) => i !== idx))

  return (
    <div>
      {label && <label className="form-label small text-muted mb-1">{label}</label>}
      <div className="d-flex flex-wrap gap-2">
        {value.map((f, i) => (
          <div key={i} className="position-relative" style={{ width: 84, height: 84 }}>
            {f.type === 'VIDEO' ? (
              <div className="d-flex flex-column align-items-center justify-content-center bg-light border h-100 w-100" style={{ borderRadius: 6 }}>
                <Film size={22} className="text-muted" />
                <span className="text-muted" style={{ fontSize: 9 }}>Video</span>
              </div>
            ) : (
              <img src={f.url} alt={f.filename ?? ''} className="border" style={{ width: 84, height: 84, objectFit: 'cover', borderRadius: 6 }} />
            )}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="btn btn-sm btn-danger position-absolute d-flex align-items-center justify-content-center p-0"
                style={{ top: -6, right: -6, width: 20, height: 20, borderRadius: '50%' }}
              >
                <X size={12} />
              </button>
            )}
          </div>
        ))}

        {!disabled && value.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="d-flex flex-column align-items-center justify-content-center bg-white border text-muted"
            style={{ width: 84, height: 84, borderRadius: 6, borderStyle: 'dashed' }}
          >
            {uploading ? <Loader2 size={20} className="animate-spin" /> : <Upload size={20} />}
            <span style={{ fontSize: 10 }}>{uploading ? 'Đang tải...' : 'Thêm'}</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={acceptAttr}
        multiple
        className="d-none"
        onChange={(e) => handleFiles(e.target.files)}
      />
    </div>
  )
}
