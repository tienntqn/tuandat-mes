import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLiquidatedMachines } from './machine.hooks'
import { Pagination } from '@/components/shared/Pagination'
import { PageWrapper } from '@/components/layout/PageWrapper'

const fmtDate = (d?: string | null) => (d ? new Date(d).toLocaleDateString('vi-VN') : '—')

export default function LiquidationPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, refetch } = useLiquidatedMachines({ page, pageSize: 20 })

  return (
    <PageWrapper
      title="Máy đã thanh lý"
      breadcrumbs={[{ label: 'Quản lý máy móc' }, { label: 'Thanh lý' }]}
      actions={
        <button onClick={() => refetch()} className="btn btn-outline-secondary btn-icon"><span><i className="fe fe-rotate-ccw"></i></span></button>
      }
    >
      <p className="text-muted mb-3">Lịch sử các máy đã thanh lý · {data?.total ?? 0} máy</p>
      <div className="card"><div className="card-body p-0"><div className="table-responsive">
        <table className="table table-hover table-vcenter mb-0">
          <thead className="thead-light"><tr><th>Mã máy</th><th>Tên máy</th><th>Xưởng</th><th>Ngày thanh lý</th><th>Lý do</th><th>Số QĐ</th><th className="text-end">Giá trị thu hồi</th></tr></thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Đang tải...</td></tr>
            ) : data?.data.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-4 text-muted">Chưa có máy nào được thanh lý</td></tr>
            ) : (
              data?.data.map((m) => (
                <tr key={m.id}>
                  <td><Link to={`/machines/${m.id}`} className="text-decoration-none"><code>{m.code}</code></Link></td>
                  <td className="fw-medium">{m.name}</td>
                  <td className="text-muted">{m.factory?.name ?? '—'}</td>
                  <td>{fmtDate(m.liquidation?.liquidationDate ?? m.liquidatedAt)}</td>
                  <td className="small">{m.liquidation?.reason ?? '—'}</td>
                  <td className="text-muted small">{m.liquidation?.decisionNo ?? '—'}</td>
                  <td className="text-end">{m.liquidation?.salvageValue != null ? Number(m.liquidation.salvageValue).toLocaleString('vi-VN') + ' đ' : '—'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div></div></div>

      {data && <Pagination page={page} totalPages={data.totalPages} total={data.total} pageSize={data.pageSize} onPageChange={setPage} />}
    </PageWrapper>
  )
}
