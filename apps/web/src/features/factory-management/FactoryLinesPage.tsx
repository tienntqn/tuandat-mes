import { useState } from 'react'
import { useFactories } from '@/features/factory/factory.hooks'
import { useLinesByFactory, useCreateLine, useUpdateLine, useDeleteLine, useRestoreLine } from '@/features/production-line/line.hooks'
import { LineFormDialog } from '@/features/production-line/LineFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { StatusBadge } from '@/components/shared/StatusBadge'
import { PageWrapper } from '@/components/layout/PageWrapper'
import type { ProductionLine, CreateLineDto } from '@/features/production-line/line.api'
import type { Factory } from '@/features/factory/factory.api'
import { useAuthStore } from '@/stores/auth.store'

interface FactoryPanelProps {
  factory: Factory
  canWrite: boolean
}

function FactoryPanel({ factory, canWrite }: FactoryPanelProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<ProductionLine | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<ProductionLine | null>(null)

  const { data: lines = [], isLoading, refetch } = useLinesByFactory(factory.id)
  const createLine = useCreateLine()
  const updateLine = useUpdateLine()
  const deleteLine = useDeleteLine()
  const restoreLine = useRestoreLine()

  const handleSubmit = (dto: CreateLineDto) => {
    if (editTarget) {
      updateLine.mutate(
        { id: editTarget.id, dto },
        { onSuccess: () => { setFormOpen(false); setEditTarget(null) } },
      )
    } else {
      createLine.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const activeLines = lines.filter((l) => !l.deletedAt)
  const inactiveLines = lines.filter((l) => l.deletedAt)

  return (
    <div className="card mb-3">
      {/* Factory header — click để mở/đóng */}
      <div
        className="card-header d-flex align-items-center justify-content-between py-3"
        style={{ cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setCollapsed((v) => !v)}
      >
        <div className="d-flex align-items-center gap-3">
          <i className={`fe fe-chevron-${collapsed ? 'right' : 'down'} text-muted`}></i>
          <div>
            <div className="d-flex align-items-center gap-2">
              <code className="text-primary fw-bold">{factory.code}</code>
              <span className="fw-semibold">{factory.name}</span>
              <StatusBadge status={factory.status} />
            </div>
            {factory.address && (
              <small className="text-muted d-block">{factory.address}</small>
            )}
          </div>
        </div>
        <div className="d-flex align-items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <span className="badge bg-secondary-transparent text-secondary">
            {activeLines.length} chuyền
          </span>
          {canWrite && (
            <button
              className="btn btn-sm btn-primary text-white"
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              title="Thêm chuyền vào xưởng này"
            >
              <i className="fe fe-plus me-1"></i> Thêm chuyền
            </button>
          )}
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={() => refetch()}
            title="Làm mới"
          >
            <i className="fe fe-rotate-ccw"></i>
          </button>
        </div>
      </div>

      {/* Danh sách chuyền */}
      {!collapsed && (
        <div className="card-body p-0">
          {isLoading ? (
            <div className="text-center text-muted py-3">
              <span className="spinner-border spinner-border-sm me-2"></span>Đang tải...
            </div>
          ) : lines.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="fe fe-inbox d-block mb-2" style={{ fontSize: 24 }}></i>
              Chưa có chuyền nào trong xưởng này
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover table-vcenter mb-0">
                <thead className="thead-light">
                  <tr>
                    <th style={{ width: 120 }}>Số chuyền</th>
                    <th>Tên chuyền</th>
                    <th style={{ width: 140 }}>Năng lực/ngày</th>
                    <th style={{ width: 140 }}>Trạng thái</th>
                    {canWrite && <th className="text-end" style={{ width: 120 }}>Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {activeLines.map((line) => (
                    <tr key={line.id}>
                      <td className="fw-medium">
                        <span className="badge bg-primary-transparent text-primary">
                          Chuyền {line.lineNumber}
                        </span>
                      </td>
                      <td>{line.name}</td>
                      <td className="text-muted">
                        {line.capacity > 0 ? `${line.capacity.toLocaleString('vi-VN')} SP` : '—'}
                      </td>
                      <td><StatusBadge status={line.status} /></td>
                      {canWrite && (
                        <td className="text-end">
                          <div className="d-flex justify-content-end gap-1">
                            <button
                              onClick={() => { setEditTarget(line); setFormOpen(true) }}
                              title="Chỉnh sửa"
                              className="btn btn-sm btn-outline-secondary"
                            >
                              <i className="fe fe-edit-2"></i>
                            </button>
                            <button
                              onClick={() => setDeleteTarget(line)}
                              title="Xóa"
                              className="btn btn-sm btn-outline-danger"
                            >
                              <i className="fe fe-trash-2"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}

                  {/* Chuyền đã xóa (mờ) */}
                  {inactiveLines.map((line) => (
                    <tr key={line.id} className="opacity-50">
                      <td className="fw-medium">
                        <span className="badge bg-secondary-transparent text-secondary">
                          Chuyền {line.lineNumber}
                        </span>
                      </td>
                      <td>
                        <span className="text-decoration-line-through">{line.name}</span>
                        <span className="badge bg-danger-transparent text-danger ms-2">Đã xóa</span>
                      </td>
                      <td>—</td>
                      <td>—</td>
                      {canWrite && (
                        <td className="text-end">
                          <button
                            onClick={() => restoreLine.mutate(line.id)}
                            title="Khôi phục"
                            className="btn btn-sm btn-outline-secondary"
                          >
                            <i className="fe fe-rotate-ccw"></i>
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <LineFormDialog
        open={formOpen}
        line={editTarget}
        defaultFactoryId={factory.id}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createLine.isPending || updateLine.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa chuyền"
        description={`Bạn có chắc muốn xóa chuyền "${deleteTarget?.name}"? Hành động này có thể khôi phục.`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteLine.isPending}
        onConfirm={() =>
          deleteTarget &&
          deleteLine.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

export default function FactoryLinesPage() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ACTIVE')

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR')

  const { data: factoriesData, isLoading, refetch } = useFactories({
    search: search || undefined,
    status: statusFilter || undefined,
    pageSize: 200,
  })
  const factories = factoriesData?.data ?? []

  return (
    <PageWrapper
      title="Quản lý Chuyền may"
      breadcrumbs={[{ label: 'Quản lý nhà máy' }, { label: 'Chuyền may' }]}
      actions={
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon">
          <span><i className="fe fe-rotate-ccw"></i></span>
        </button>
      }
    >
      {/* Bộ lọc */}
      <div className="row mb-3">
        <div className="col-auto">
          <div className="input-group">
            <input
              className="form-control"
              placeholder="Tìm xưởng..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="input-group-text"><i className="fe fe-search"></i></span>
          </div>
        </div>
        <div className="col-auto">
          <select
            className="form-select"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ACTIVE">Xưởng đang hoạt động</option>
            <option value="INACTIVE">Xưởng ngừng hoạt động</option>
            <option value="">Tất cả xưởng</option>
          </select>
        </div>
        <div className="col-auto d-flex align-items-center">
          <small className="text-muted">{factories.length} xưởng</small>
        </div>
      </div>

      {/* Danh sách xưởng + chuyền */}
      {isLoading ? (
        <div className="text-center text-muted py-5">
          <span className="spinner-border me-2"></span>Đang tải...
        </div>
      ) : factories.length === 0 ? (
        <div className="card">
          <div className="card-body text-center text-muted py-5">
            <i className="fe fe-layers d-block mb-2" style={{ fontSize: 40, opacity: 0.3 }}></i>
            <p>Không tìm thấy xưởng nào</p>
          </div>
        </div>
      ) : (
        factories.map((factory) => (
          <FactoryPanel key={factory.id} factory={factory} canWrite={canWrite} />
        ))
      )}
    </PageWrapper>
  )
}
