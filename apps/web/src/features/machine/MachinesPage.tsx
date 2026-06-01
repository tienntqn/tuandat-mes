import { useState } from 'react'
import { Plus, RefreshCw, Pencil, Trash2, Search, GitBranch } from 'lucide-react'
import { useMachines, useCreateMachine, useUpdateMachine, useDeleteMachine, useAssignLine } from './machine.hooks'
import { MachineFormDialog } from './MachineFormDialog'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { Pagination } from '@/components/shared/Pagination'
import { StatusBadge } from '@/components/shared/StatusBadge'
import type { Machine, CreateMachineDto, MachineType, MachineStatus } from './machine.api'
import { MACHINE_TYPE_LABELS, MACHINE_STATUS_LABELS } from './machine.api'
import { useAuthStore } from '@/stores/auth.store'
import { factoryApi } from '@/features/factory/factory.api'
import { useQuery } from '@tanstack/react-query'
import { lineApi } from '@/features/production-line/line.api'

export default function MachinesPage() {
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  const [filterType, setFilterType] = useState<string>('')
  const [filterFactoryId, setFilterFactoryId] = useState<string>('')
  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<Machine | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Machine | null>(null)

  const { isAdmin, hasRole } = useAuthStore()
  const canWrite = isAdmin() || hasRole('BOD') || hasRole('FACTORY_DIRECTOR') || hasRole('MECHANIC')

  const params = {
    search: search || undefined,
    status: filterStatus as MachineStatus || undefined,
    type: filterType as MachineType || undefined,
    factoryId: filterFactoryId ? Number(filterFactoryId) : undefined,
    page,
    pageSize: 20,
  }

  const { data, isLoading, refetch } = useMachines(params)
  const { data: factories } = useQuery({ queryKey: ['factories-all'], queryFn: () => factoryApi.list({ pageSize: 100 }) })
  const { data: linesData } = useQuery({ queryKey: ['lines-all'], queryFn: () => lineApi.list({ pageSize: 200 }) })

  const createMachine = useCreateMachine()
  const updateMachine = useUpdateMachine()
  const deleteMachine = useDeleteMachine()

  const handleSubmit = (dto: CreateMachineDto) => {
    if (editTarget) {
      updateMachine.mutate({ id: editTarget.id, dto }, { onSuccess: () => { setFormOpen(false); setEditTarget(null) } })
    } else {
      createMachine.mutate(dto, { onSuccess: () => setFormOpen(false) })
    }
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMachine.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
  }

  const factoryList = factories?.data ?? []
  const lineList = (linesData?.data ?? []).map((l: any) => ({ id: l.id, name: l.name, lineNumber: l.lineNumber, factoryId: l.factoryId }))

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Danh sách Máy móc</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{data?.total ?? 0} máy</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => refetch()} className="flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent">
            <RefreshCw className="h-4 w-4" />
          </button>
          {canWrite && (
            <button
              onClick={() => { setEditTarget(null); setFormOpen(true) }}
              className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              Thêm máy
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="rounded-lg border pl-9 pr-3 py-2 text-sm w-56"
            placeholder="Tìm mã, tên máy, hãng..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={filterFactoryId}
          onChange={(e) => { setFilterFactoryId(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả xưởng</option>
          {factoryList.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả loại</option>
          {(Object.entries(MACHINE_TYPE_LABELS) as [MachineType, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
        <select
          className="rounded-lg border px-3 py-2 text-sm bg-background"
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
        >
          <option value="">Tất cả trạng thái</option>
          {(Object.entries(MACHINE_STATUS_LABELS) as [MachineStatus, string][]).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="rounded-xl border overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Mã</th>
              <th className="px-4 py-3 text-left font-medium">Tên máy</th>
              <th className="px-4 py-3 text-left font-medium">Loại</th>
              <th className="px-4 py-3 text-left font-medium">Xưởng</th>
              <th className="px-4 py-3 text-left font-medium">Chuyền</th>
              <th className="px-4 py-3 text-left font-medium">Hãng / Model</th>
              <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
              <th className="px-4 py-3 text-left font-medium">Hạn BD tiếp</th>
              {canWrite && <th className="px-4 py-3 text-right font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">Không có dữ liệu</td></tr>
            ) : (
              data?.data.map((machine) => {
                const nextDue = machine.maintenances?.[0]?.nextDueDate
                const isOverdue = nextDue && new Date(nextDue) < new Date()
                return (
                  <tr key={machine.id} className="border-t hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{machine.code}</td>
                    <td className="px-4 py-3 font-medium">{machine.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{MACHINE_TYPE_LABELS[machine.type]}</td>
                    <td className="px-4 py-3">{machine.factory?.name ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {machine.line ? `Chuyền ${machine.line.lineNumber}` : <span className="text-xs text-muted-foreground/60">Chưa gán</span>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {[machine.brand, machine.model].filter(Boolean).join(' / ') || '—'}
                    </td>
                    <td className="px-4 py-3"><MachineStatusBadge status={machine.status} /></td>
                    <td className="px-4 py-3 text-xs">
                      {nextDue ? (
                        <span className={isOverdue ? 'text-destructive font-medium' : 'text-amber-600'}>
                          {isOverdue ? '⚠ ' : ''}{new Date(nextDue).toLocaleDateString('vi-VN')}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/60">—</span>
                      )}
                    </td>
                    {canWrite && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditTarget(machine); setFormOpen(true) }}
                            title="Chỉnh sửa"
                            className="p-1.5 rounded hover:bg-accent text-muted-foreground"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(machine)}
                            title="Xóa"
                            className="p-1.5 rounded hover:bg-accent text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />
      )}

      <MachineFormDialog
        open={formOpen}
        machine={editTarget}
        factories={factoryList}
        lines={lineList}
        onClose={() => { setFormOpen(false); setEditTarget(null) }}
        onSubmit={handleSubmit}
        isPending={createMachine.isPending || updateMachine.isPending}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa máy"
        description={`Bạn có chắc muốn xóa máy "${deleteTarget?.name}"?`}
        confirmLabel="Xóa"
        destructive
        isPending={deleteMachine.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  )
}

function MachineStatusBadge({ status }: { status: MachineStatus }) {
  const colorMap: Record<MachineStatus, string> = {
    RUNNING: 'bg-green-100 text-green-700',
    IDLE: 'bg-gray-100 text-gray-600',
    MAINTENANCE: 'bg-blue-100 text-blue-700',
    BROKEN: 'bg-red-100 text-red-700',
    STOPPED: 'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}>
      {MACHINE_STATUS_LABELS[status]}
    </span>
  )
}
