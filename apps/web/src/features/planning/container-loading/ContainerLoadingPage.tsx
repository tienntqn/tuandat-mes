import { useEffect, useMemo, useRef, useState } from 'react'
import { PageWrapper } from '@/components/layout/PageWrapper'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { toast } from '@/lib/toast'
import { useCustomersActive } from '@/features/customer/customer.hooks'
import { CONTAINER_GROUPS, findContainerPreset, colorForIndex } from './container-presets'
import { packContainers } from './container-loading.utils'
import type { PackingMode } from './container-loading.utils'
import type { CartonInput, PackingSummary } from './container-loading.types'
import { ContainerScene } from './ContainerScene'
import { ContainerLoadingPrintDialog } from './ContainerLoadingPrintDialog'
import { CartonCatalogTab } from './CartonCatalogTab'
import { useCartonTypes } from './carton-type.hooks'
import {
  useContainerLoadingPlans, useContainerLoadingPlan,
  useCreateContainerLoadingPlan, useDeleteContainerLoadingPlan,
} from './container-loading.hooks'
import type { ContainerLoadingPlanSummary } from './container-loading.api'

let rowIdSeq = 1
function newCartonRow(index: number): CartonInput {
  const seq = rowIdSeq++
  return { id: `row-${seq}`, label: `Thùng ${index + 1}`, length: 0, width: 0, height: 0, quantity: 1, color: colorForIndex(index) }
}

const formatDate = (d: string) => new Date(d).toLocaleString('vi-VN')

// Kích thước thùng carton nhập theo cm (trực quan hơn với carton thực tế), nhưng CartonInput.length/width/height
// nội bộ vẫn lưu theo mét (khớp đơn vị container/thuật toán xếp) — quy đổi ngay tại biên nhập/hiển thị.
const CM_PER_M = 100

function SummaryCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="col-md-3 col-sm-6">
      <div className="card mb-0">
        <div className="card-body py-3">
          <div className="text-muted small">{label}</div>
          <div className="fs-4 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  )
}

export default function ContainerLoadingPage() {
  const [tab, setTab] = useState<'new' | 'catalog' | 'history'>('new')

  // ---- Khách hàng: chọn khách để tự nạp danh mục thùng của khách đó ----
  const { data: customers } = useCustomersActive()
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | undefined>(undefined)
  const { data: customerCartonTypes } = useCartonTypes(selectedCustomerId)
  const loadedForCustomerRef = useRef<number | undefined>(undefined)

  // ---- Chọn loại container (dropdown 2 cấp) ----
  const [groupIdx, setGroupIdx] = useState(0)
  const [containerCode, setContainerCode] = useState(CONTAINER_GROUPS[0].options[0].code)
  const preset = findContainerPreset(containerCode) ?? CONTAINER_GROUPS[0].options[0]
  const presetVolume = preset.length * preset.width * preset.height

  function handleGroupChange(idx: number) {
    setGroupIdx(idx)
    setContainerCode(CONTAINER_GROUPS[idx].options[0].code)
  }

  // ---- Cách sắp xếp: tối ưu thể tích (trộn loại thùng) hoặc theo loại thùng (không trộn) ----
  // Mặc định 'byType': xếp từ trong ra cửa, hoàn thành hết loại này mới sang loại khác — đúng nghiệp vụ
  // xuất phiếu hướng dẫn xếp hàng cho nhân viên (buildLoadingSequence), tránh lẫn lộn nhiều loại xen kẽ.
  const [packingMode, setPackingMode] = useState<PackingMode>('byType')

  // ---- Danh sách loại thùng nhập vào ----
  const [cartonRows, setCartonRows] = useState<CartonInput[]>([newCartonRow(0)])

  function addRow() {
    setCartonRows((rows) => [...rows, newCartonRow(rows.length)])
  }
  function removeRow(id: string) {
    setCartonRows((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows))
  }
  function updateRow(id: string, patch: Partial<CartonInput>) {
    setCartonRows((rows) => rows.map((r) => (r.id === id ? { ...r, ...patch } : r)))
  }

  // Chọn khách hàng → tự nạp danh mục thùng của khách vào danh sách xếp (chỉ 1 lần mỗi lần đổi khách,
  // không ghi đè khi danh mục được cập nhật ngầm ở tab "Danh mục thùng" trong lúc đang xem khách này)
  function loadCartonTypesIntoRows() {
    if (!customerCartonTypes) return
    setCartonRows(
      customerCartonTypes.length > 0
        ? customerCartonTypes.map((ct, i) => ({
            id: `preset-${ct.id}`,
            label: ct.label,
            length: Number(ct.length),
            width: Number(ct.width),
            height: Number(ct.height),
            quantity: 1,
            color: colorForIndex(i),
          }))
        : [newCartonRow(0)],
    )
  }

  useEffect(() => {
    if (selectedCustomerId == null) return
    if (customerCartonTypes == null) return
    if (loadedForCustomerRef.current === selectedCustomerId) return
    loadedForCustomerRef.current = selectedCustomerId
    if (customerCartonTypes.length === 0) {
      toast.error('Khách hàng này chưa có loại thùng nào — vào tab "Danh mục thùng" để thêm')
    }
    loadCartonTypesIntoRows()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCustomerId, customerCartonTypes])

  // ---- Kết quả xếp ----
  const [packingResult, setPackingResult] = useState<PackingSummary | null>(null)
  const [activeContainerIdx, setActiveContainerIdx] = useState(0)
  const [isComputing, setIsComputing] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [printOpen, setPrintOpen] = useState(false)
  const [showBoxNumbers, setShowBoxNumbers] = useState(true)

  const currentContainer = packingResult?.containers[activeContainerIdx]

  const legendItems = useMemo(() => {
    if (!currentContainer) return []
    const map = new Map<string, { label: string; color: string; count: number }>()
    for (const b of currentContainer.placedBoxes) {
      const cur = map.get(b.cartonId) ?? { label: b.label, color: b.color, count: 0 }
      cur.count++
      map.set(b.cartonId, cur)
    }
    return [...map.values()]
  }, [currentContainer])

  function handlePack() {
    for (const row of cartonRows) {
      if (row.length <= 0 || row.width <= 0 || row.height <= 0) {
        toast.error(`Thùng "${row.label}": kích thước dài/rộng/cao phải lớn hơn 0`)
        return
      }
      if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
        toast.error(`Thùng "${row.label}": số lượng phải lớn hơn 0`)
        return
      }
    }

    setIsComputing(true)
    // Trì hoãn 1 nhịp để UI kịp hiển thị trạng thái "đang xử lý" trước khi chạy thuật toán (đồng bộ, có thể mất chút thời gian với nhiều thùng)
    setTimeout(() => {
      const summary = packContainers(
        preset.code,
        { length: preset.length, width: preset.width, height: preset.height },
        cartonRows,
        packingMode,
      )
      setPackingResult(summary)
      setActiveContainerIdx(0)
      setIsComputing(false)
      if (summary.unfitCartons.length > 0) {
        toast.error(`Có ${summary.unfitCartons.length} vấn đề khi xếp — xem chi tiết bên dưới kết quả`)
      } else {
        toast.success(`Đã xếp xong, dùng ${summary.containersUsed} container`)
      }
    }, 30)
  }

  // ---- Lưu lịch sử ----
  const createMutation = useCreateContainerLoadingPlan()
  function handleSave() {
    if (!packingResult) return
    createMutation.mutate(
      {
        name: saveName.trim() || undefined,
        containerTypeCode: packingResult.containerTypeCode,
        containerLength: packingResult.containerLength,
        containerWidth: packingResult.containerWidth,
        containerHeight: packingResult.containerHeight,
        cartons: cartonRows,
        result: packingResult,
        containersUsed: packingResult.containersUsed,
        overallUtilization: packingResult.overallUtilizationPercent,
      },
      { onSuccess: () => setSaveName('') },
    )
  }

  // ---- Tab Lịch sử ----
  const { data: historyData, isLoading: historyLoading } = useContainerLoadingPlans({ page: 1, pageSize: 20 })
  const deleteMutation = useDeleteContainerLoadingPlan()
  const [deleteTarget, setDeleteTarget] = useState<ContainerLoadingPlanSummary | null>(null)
  const [viewingId, setViewingId] = useState<number | undefined>(undefined)
  const viewingQuery = useContainerLoadingPlan(viewingId)

  function handleView(id: number) {
    setViewingId(id)
  }

  // Khi dữ liệu chi tiết lịch sử tải xong, nạp vào phần kết quả để xem lại 3D ngay, không tính lại
  useEffect(() => {
    if (viewingQuery.data && viewingQuery.data.id === viewingId) {
      setPackingResult(viewingQuery.data.result)
      setCartonRows(viewingQuery.data.cartons)
      setContainerCode(viewingQuery.data.containerTypeCode)
      setActiveContainerIdx(0)
      setTab('new')
    }
  }, [viewingQuery.data, viewingId])

  return (
    <PageWrapper
      title="Xếp container"
      breadcrumbs={[{ label: 'Phân hệ Kế hoạch' }, { label: 'Tiện ích' }, { label: 'Xếp container' }]}
    >
      <div className="nav nav-tabs mb-3">
        <a className={`nav-link ${tab === 'new' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab('new')}>
          Xếp container
        </a>
        <a className={`nav-link ${tab === 'catalog' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab('catalog')}>
          Danh mục thùng
        </a>
        <a className={`nav-link ${tab === 'history' ? 'active' : ''}`} style={{ cursor: 'pointer' }} onClick={() => setTab('history')}>
          Lịch sử
        </a>
      </div>

      {tab === 'new' && (
        <>
          <div className="row gy-4">
            <div className="col-xl-8">
              <div className="card">
                <div className="card-body">
                  <h6 className="mb-3">1. Chọn khách hàng (tuỳ chọn)</h6>
                  <div className="row gy-3 mb-4 align-items-end">
                    <div className="col-md-8">
                      <label className="form-label">Khách hàng</label>
                      <select
                        className="form-select"
                        value={selectedCustomerId ?? ''}
                        onChange={(e) => setSelectedCustomerId(e.target.value ? Number(e.target.value) : undefined)}
                      >
                        <option value="">-- Không chọn khách (nhập thùng thủ công) --</option>
                        {customers?.map((c) => (
                          <option key={c.id} value={c.id}>{c.code} - {c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-4">
                      <button
                        type="button"
                        className="btn btn-outline-secondary w-100"
                        disabled={!selectedCustomerId}
                        onClick={loadCartonTypesIntoRows}
                        title="Nạp lại danh mục thùng của khách (nếu vừa thêm/sửa ở tab Danh mục thùng)"
                      >
                        <i className="fe fe-refresh-cw me-1"></i>Nạp lại danh mục
                      </button>
                    </div>
                  </div>

                  <h6 className="mb-3">2. Chọn loại container</h6>
                  <div className="row gy-3 mb-3">
                    <div className="col-md-6">
                      <label className="form-label">Nhóm container</label>
                      <select className="form-select" value={groupIdx} onChange={(e) => handleGroupChange(Number(e.target.value))}>
                        {CONTAINER_GROUPS.map((g, i) => (
                          <option key={g.group} value={i}>{g.group}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Loại</label>
                      <select className="form-select" value={containerCode} onChange={(e) => setContainerCode(e.target.value)}>
                        {CONTAINER_GROUPS[groupIdx].options.map((o) => (
                          <option key={o.code} value={o.code}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-muted small mb-4">
                    Dài {preset.length.toFixed(3)} m – Rộng {preset.width.toFixed(3)} m – Cao {preset.height.toFixed(3)} m
                    {' '}(Thể tích ~{presetVolume.toFixed(1)} m³)
                  </p>

                  <h6 className="mb-3">3. Cách sắp xếp</h6>
                  <div className="mb-4">
                    <div className="form-check mb-2">
                      <input
                        type="radio"
                        className="form-check-input"
                        id="packing-mode-optimized"
                        checked={packingMode === 'optimized'}
                        onChange={() => setPackingMode('optimized')}
                      />
                      <label className="form-check-label" htmlFor="packing-mode-optimized">
                        <strong>Tối ưu thể tích</strong> — trộn các loại thùng để lấp đầy container tốt nhất
                      </label>
                    </div>
                    <div className="form-check">
                      <input
                        type="radio"
                        className="form-check-input"
                        id="packing-mode-byType"
                        checked={packingMode === 'byType'}
                        onChange={() => setPackingMode('byType')}
                      />
                      <label className="form-check-label" htmlFor="packing-mode-byType">
                        <strong>Theo loại thùng</strong> — xếp từ trong ra cửa, về cơ bản hết loại này mới đến loại khác; nếu cuối 1 loại còn dư chỗ trống ở đúng vị trí đó, loại kế tiếp được chen vào luôn để tiết kiệm container thay vì bỏ trống
                      </label>
                    </div>
                  </div>

                  <div className="d-flex align-items-center justify-content-between mb-3">
                    <h6 className="mb-0">4. Danh sách thùng cần xếp</h6>
                    <button type="button" className="btn btn-sm btn-outline-primary" onClick={addRow}>
                      <i className="fe fe-plus me-1"></i>Thêm dòng
                    </button>
                  </div>

                  <div className="table-responsive">
                    <table className="table table-bordered align-middle">
                      <thead>
                        <tr>
                          <th style={{ width: 32 }}></th>
                          <th>Tên/mã thùng</th>
                          <th style={{ width: 110 }}>Dài (cm)</th>
                          <th style={{ width: 110 }}>Rộng (cm)</th>
                          <th style={{ width: 110 }}>Cao (cm)</th>
                          <th style={{ width: 100 }}>Số lượng</th>
                          <th style={{ width: 40 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {cartonRows.map((row) => (
                          <tr key={row.id}>
                            <td>
                              <span
                                style={{ display: 'inline-block', width: 16, height: 16, borderRadius: 3, background: row.color }}
                              ></span>
                            </td>
                            <td>
                              <input
                                className="form-control form-control-sm"
                                value={row.label}
                                onChange={(e) => updateRow(row.id, { label: e.target.value })}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min={0} step={0.1}
                                className="form-control form-control-sm"
                                value={row.length ? row.length * CM_PER_M : ''}
                                onChange={(e) => updateRow(row.id, { length: Number(e.target.value) / CM_PER_M })}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min={0} step={0.1}
                                className="form-control form-control-sm"
                                value={row.width ? row.width * CM_PER_M : ''}
                                onChange={(e) => updateRow(row.id, { width: Number(e.target.value) / CM_PER_M })}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min={0} step={0.1}
                                className="form-control form-control-sm"
                                value={row.height ? row.height * CM_PER_M : ''}
                                onChange={(e) => updateRow(row.id, { height: Number(e.target.value) / CM_PER_M })}
                              />
                            </td>
                            <td>
                              <input
                                type="number" min={1} step={1}
                                className="form-control form-control-sm"
                                value={row.quantity || ''}
                                onChange={(e) => updateRow(row.id, { quantity: Number(e.target.value) })}
                              />
                            </td>
                            <td className="text-center">
                              <button
                                type="button"
                                className="btn btn-sm btn-link text-danger p-0"
                                disabled={cartonRows.length <= 1}
                                onClick={() => removeRow(row.id)}
                              >
                                <i className="fe fe-trash-2"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <button type="button" className="btn btn-primary mt-2" onClick={handlePack} disabled={isComputing}>
                    {isComputing ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Đang sắp xếp...</>
                    ) : (
                      <><i className="fe fe-box me-1"></i>Sắp xếp</>
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="col-xl-4">
              <div className="card border-info">
                <div className="card-body">
                  <h6 className="mb-3">Lưu ý</h6>
                  <ul className="ps-3 mb-0">
                    <li>Thùng chỉ được xoay theo chiều dài/rộng — chiều cao luôn giữ đúng chiều (nắp ở trên).</li>
                    <li>Thuật toán ưu tiên xếp từ điểm trong cùng ra ngoài, khoảng dư sẽ nằm gần cửa container.</li>
                    <li>Nếu tổng số thùng vượt sức chứa 1 container, hệ thống tự tính thêm container tiếp theo.</li>
                    <li>Chế độ "Theo loại thùng" có thể tốn nhiều container hơn "Tối ưu thể tích" (không được trộn loại để lấp khoảng trống dư của loại trước), đổi lại nhân viên xếp lần lượt từng loại từ trong ra cửa, không phải xếp xen kẽ nhiều loại cùng lúc.</li>
                    <li>Tổng số thùng xử lý được giới hạn ở mức hợp lý để đảm bảo tốc độ tính toán trên trình duyệt.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {packingResult && (
            <div className="mt-4">
              <div className="row gy-3 mb-3">
                <SummaryCard label="Tổng số thùng cần xếp" value={packingResult.totalCartonsRequested.toLocaleString('vi-VN')} />
                <SummaryCard
                  label="Đã xếp được"
                  value={`${packingResult.totalCartonsPlaced.toLocaleString('vi-VN')} (${packingResult.totalCartonsRequested > 0 ? ((packingResult.totalCartonsPlaced / packingResult.totalCartonsRequested) * 100).toFixed(1) : '0'}%)`}
                />
                <SummaryCard label="Số container cần dùng" value={packingResult.containersUsed} />
                <SummaryCard label="Hiệu suất sử dụng thể tích TB" value={`${packingResult.overallUtilizationPercent.toFixed(1)}%`} />
              </div>

              {packingResult.unfitCartons.length > 0 && (
                <div className="alert alert-warning">
                  <strong>Không xếp được:</strong>
                  <ul className="mb-0 ps-3">
                    {packingResult.unfitCartons.map((u, i) => (
                      <li key={i}>{u.label}: {u.reason}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="d-flex align-items-center justify-content-between mb-3">
                <div className="nav nav-tabs mb-0 flex-grow-1">
                  {packingResult.containers.map((c, i) => (
                    <a
                      key={c.index}
                      className={`nav-link ${activeContainerIdx === i ? 'active' : ''}`}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setActiveContainerIdx(i)}
                    >
                      Container {c.index} ({c.utilizationPercent.toFixed(1)}%)
                    </a>
                  ))}
                </div>
                <button
                  type="button"
                  className={`btn btn-sm flex-shrink-0 ms-2 ${showBoxNumbers ? 'btn-outline-secondary active' : 'btn-outline-secondary'}`}
                  onClick={() => setShowBoxNumbers((v) => !v)}
                  title={showBoxNumbers ? 'Ẩn số thứ tự thùng' : 'Hiện số thứ tự thùng'}
                >
                  <i className={`fe ${showBoxNumbers ? 'fe-eye' : 'fe-eye-off'} me-1`}></i>
                  {showBoxNumbers ? 'Ẩn số thùng' : 'Hiện số thùng'}
                </button>
                <button type="button" className="btn btn-sm btn-outline-primary flex-shrink-0 ms-2" onClick={() => setPrintOpen(true)}>
                  <i className="fe fe-printer me-1"></i>In / Xuất PDF cho nhân viên
                </button>
              </div>

              <div className="row gy-3">
                <div className="col-xl-9">
                  <div className="card">
                    <div className="card-body p-0" style={{ height: 500 }}>
                      {currentContainer && (
                        <ContainerScene
                          containerLength={packingResult.containerLength}
                          containerWidth={packingResult.containerWidth}
                          containerHeight={packingResult.containerHeight}
                          boxes={currentContainer.placedBoxes}
                          showNumbers={showBoxNumbers}
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="col-xl-3">
                  <div className="card">
                    <div className="card-body">
                      <h6 className="mb-3">Chú giải</h6>
                      {legendItems.map((item) => (
                        <div key={item.label} className="d-flex align-items-center mb-2">
                          <span
                            style={{ display: 'inline-block', width: 14, height: 14, borderRadius: 3, background: item.color, marginRight: 8 }}
                          ></span>
                          <span className="small">{item.label} × {item.count}</span>
                        </div>
                      ))}
                      {legendItems.length === 0 && <p className="text-muted small mb-0">Không có thùng nào được xếp trong container này.</p>}
                    </div>
                  </div>

                  <div className="card mt-3">
                    <div className="card-body">
                      <h6 className="mb-3">Lưu vào lịch sử</h6>
                      <input
                        className="form-control form-control-sm mb-2"
                        placeholder="Tên (tuỳ chọn)"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                      />
                      <button type="button" className="btn btn-sm btn-success w-100" onClick={handleSave} disabled={createMutation.isPending}>
                        {createMutation.isPending ? 'Đang lưu...' : 'Lưu vào lịch sử'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'catalog' && (
        <CartonCatalogTab
          customers={customers ?? []}
          customerId={selectedCustomerId}
          onCustomerChange={setSelectedCustomerId}
        />
      )}

      {tab === 'history' && (
        <div className="card">
          <div className="card-body">
            {historyLoading ? (
              <p className="text-muted mb-0">Đang tải...</p>
            ) : !historyData || historyData.data.length === 0 ? (
              <p className="text-muted mb-0">Chưa có lịch sử xếp container nào.</p>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Tên</th>
                      <th>Loại container</th>
                      <th>Số container</th>
                      <th>Hiệu suất</th>
                      <th>Người tạo</th>
                      <th>Ngày tạo</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.data.map((row) => (
                      <tr key={row.id}>
                        <td>{row.name || `#${row.id}`}</td>
                        <td>{row.containerTypeCode}</td>
                        <td>{row.containersUsed}</td>
                        <td>{Number(row.overallUtilization).toFixed(1)}%</td>
                        <td>{row.createdByName || '—'}</td>
                        <td>{formatDate(row.createdAt)}</td>
                        <td className="text-end">
                          <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => handleView(row.id)}>
                            Xem
                          </button>
                          <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => setDeleteTarget(row)}>
                            Xóa
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      <ContainerLoadingPrintDialog open={printOpen} packingResult={packingResult} onClose={() => setPrintOpen(false)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa lịch sử xếp container"
        description={`Xóa bản ghi "${deleteTarget?.name || `#${deleteTarget?.id}`}"? Hành động này không thể hoàn tác.`}
        destructive
        isPending={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </PageWrapper>
  )
}
