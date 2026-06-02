import { useCallback, useState } from 'react'
import {
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts'
import { useKpi, useKpiStream } from '@/features/report/report.hooks'
import { type KpiResult } from '@/features/report/report.api'

const PRIMARY   = '#6259ca'
const SUCCESS   = '#28a745'
const DANGER    = '#dc3545'
const WARNING   = '#ffc107'
const SECONDARY = '#6c757d'
const CHART_COLORS = [PRIMARY, '#fb6340', '#2dce89', '#11cdef', '#f4f5f7', '#172b4d']

// ─── KPI Card ────────────────────────────────────────────────
interface KpiCardProps {
  title: string
  value: string | number
  sub: string
  subColor?: string
  subIcon?: string
  icon: string        // fe fe-* class
  gradient: string    // bg-primary-gradient | bg-success-gradient | ...
  shadow: string      // box-shadow-primary | box-shadow-success | ...
}

function KpiCard({ title, value, sub, subColor = 'text-muted', icon, gradient, shadow }: KpiCardProps) {
  return (
    <div className="col-lg-6 col-md-6 col-sm-12 col-xl-3">
      <div className="card overflow-hidden">
        <div className="card-body">
          <div className="row">
            <div className="col">
              <h6 className="mb-1">{title}</h6>
              <h3 className="mb-2 number-font">{value}</h3>
              <p className={`mb-0 ${subColor}`}>{sub}</p>
            </div>
            <div className="col col-auto">
              <div className={`counter-icon ${gradient} ${shadow} brround ms-auto`}>
                <i className={`${icon} text-white mb-5`}></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Charts ──────────────────────────────────────────────────

function FactoryChart({ data }: { data: KpiResult['factoryStats'] }) {
  return (
    <div className="col-sm-12 col-md-12 col-lg-12 col-xl-8">
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">So sánh hiệu suất xưởng</h3>
            <p className="card-subtitle mb-0 text-muted">Kế hoạch vs Thực tế (SP)</p>
          </div>
        </div>
        <div className="card-body pb-0">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gradPlanned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={SECONDARY} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={SECONDARY} stopOpacity={0.05} />
                </linearGradient>
                <linearGradient id="gradActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={PRIMARY} stopOpacity={0.4} />
                  <stop offset="95%" stopColor={PRIMARY} stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="factoryName" tick={{ fontSize: 12, fill: '#8a98ac' }} />
              <YAxis tick={{ fontSize: 11, fill: '#8a98ac' }} tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}k` : v} />
              <Tooltip
                contentStyle={{ borderRadius: 8, border: '1px solid #eaedf1', fontSize: 12 }}
                formatter={(v: number) => v.toLocaleString('vi-VN')}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="plannedQty" name="Kế hoạch" stroke={SECONDARY} fill="url(#gradPlanned)" strokeWidth={2} dot={{ r: 3 }} />
              <Area type="monotone" dataKey="actualQty" name="Thực tế" stroke={PRIMARY} fill="url(#gradActual)" strokeWidth={2} dot={{ r: 3 }} strokeDasharray="4 2" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

function CustomerChart({ data }: { data: KpiResult['customerStats'] }) {
  return (
    <div className="col-sm-12 col-md-12 col-lg-12 col-xl-4">
      <div className="card custom-card">
        <div className="card-header">
          <h3 className="card-title">Sản lượng theo KH</h3>
        </div>
        <div className="card-body pt-2 ps-0 pe-0">
          <ResponsiveContainer width="100%" height={150}>
            <PieChart>
              <Pie
                data={data}
                dataKey="actualQty"
                nameKey="customerName"
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={70}
                startAngle={90}
                endAngle={-270}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v: number) => v.toLocaleString('vi-VN')} contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
          {data.length > 0 && (
            <div className="row sales-product-infomation pb-0 mb-0 mx-auto mt-2">
              {data.slice(0, 2).map((d, i) => (
                <div key={i} className="col-md-6 col text-center">
                  <p className="mb-0 d-flex justify-content-center align-items-center gap-1" style={{ fontSize: 12 }}>
                    <span className="legend" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: CHART_COLORS[i] }}></span>
                    {d.customerName}
                  </p>
                  <h4 className="mb-1 fw-bold">{d.actualQty.toLocaleString('vi-VN')}</h4>
                  <p className="text-muted mb-0" style={{ fontSize: 11 }}>SP</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StyleProgressChart({ data }: { data: KpiResult['styleStats'] }) {
  const sorted = [...data].sort((a, b) => b.pct - a.pct).slice(0, 6)
  return (
    <div className="col-xl-4 col-md-12">
      <div className="card overflow-hidden">
        <div className="card-header">
          <h3 className="card-title">Tiến độ mã hàng (Top 6)</h3>
        </div>
        <div className="card-body">
          {sorted.map((s) => (
            <div key={s.styleId} className="mb-3">
              <div className="d-flex justify-content-between mb-1" style={{ fontSize: 13 }}>
                <span className={`fw-semibold${s.isLate ? ' text-danger' : ''}`}>
                  {s.isLate && <i className="fe fe-alert-triangle me-1 text-danger" style={{ fontSize: 12 }}></i>}
                  {s.styleCode}
                </span>
                <span className="text-muted">{s.pct}%</span>
              </div>
              <div className="progress" style={{ height: 6, borderRadius: 4 }}>
                <div
                  className={`progress-bar${s.isLate ? ' bg-danger' : s.pct >= 100 ? ' bg-success' : ''}`}
                  role="progressbar"
                  style={{ width: `${Math.min(s.pct, 100)}%`, background: !s.isLate && s.pct < 100 ? PRIMARY : undefined }}
                />
              </div>
            </div>
          ))}
          {sorted.length === 0 && (
            <div className="text-center text-muted py-4">Chưa có dữ liệu</div>
          )}
        </div>
      </div>
    </div>
  )
}

function LineEfficiencyChart({ data }: { data: KpiResult['lineEfficiencies'] }) {
  const chartData = data.map((l) => ({
    name: l.lineName,
    hieuSuat: l.efficiencyPct,
    fill: l.efficiencyPct >= 100 ? SUCCESS : l.efficiencyPct >= 80 ? PRIMARY : DANGER,
  }))

  return (
    <div className="col-xl-8 col-md-12">
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Hiệu suất chuyền hôm nay</h3>
        </div>
        <div className="card-body pb-0">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
              <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11, fill: '#8a98ac' }} unit="%" />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#8a98ac' }} width={65} />
              <Tooltip
                contentStyle={{ borderRadius: 8, fontSize: 12 }}
                formatter={(v: number) => [`${v}%`, 'Hiệu suất']}
              />
              <Bar dataKey="hieuSuat" name="Hiệu suất" radius={[0, 4, 4, 0]}>
                {chartData.map((d, i) => (
                  <Cell key={i} fill={d.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

// ─── Skeleton loading ─────────────────────────────────────────
function DashboardSkeleton() {
  return (
    <div className="main-container container-fluid">
      <div className="page-header">
        <div>
          <div style={{ height: 24, width: 200, background: '#eaedf1', borderRadius: 4 }} />
          <div style={{ height: 14, width: 150, background: '#eaedf1', borderRadius: 4, marginTop: 8 }} />
        </div>
      </div>
      <div className="row">
        {[1,2,3,4].map(i => (
          <div key={i} className="col-lg-6 col-md-6 col-sm-12 col-xl-3">
            <div className="card" style={{ height: 100 }}>
              <div className="card-body d-flex align-items-center justify-content-center text-muted">
                <div className="spinner-border spinner-border-sm" role="status" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────
export default function DashboardPage() {
  const { data: initialKpi, isLoading } = useKpi()
  const [liveKpi, setLiveKpi] = useState<KpiResult | null>(null)

  const handleStream = useCallback((kpi: KpiResult) => setLiveKpi(kpi), [])
  useKpiStream(handleStream)

  const kpi = liveKpi ?? initialKpi

  if (isLoading) return <DashboardSkeleton />

  const totalToday = kpi?.totalOutputToday ?? 0
  const overallPct = kpi?.overallPct ?? 0
  const totalMtd   = kpi?.totalOutputMtd ?? 0
  const lateCount  = kpi?.lateStyleCount ?? 0
  const brokenCnt  = kpi?.brokenMachineCount ?? 0

  return (
    <div className="main-container container-fluid">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard Ban Giám đốc</h1>
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <a href="javascript:void(0);">Trang chủ</a>
            </li>
            <li className="breadcrumb-item active" aria-current="page">Dashboard</li>
          </ol>
        </div>
        <div className="ms-auto pageheader-btn">
          {liveKpi && (
            <span className="badge bg-success me-2" style={{ fontSize: 12, padding: '6px 12px' }}>
              <i className="fe fe-activity me-1"></i> Live
            </span>
          )}
          <span className="text-muted" style={{ fontSize: 12 }}>
            <i className="fe fe-refresh-cw me-1"></i> Cập nhật tự động 30 giây
          </span>
        </div>
      </div>

      {/* ROW 1 — KPI CARDS */}
      <div className="row">
        <div className="col-lg-12 col-md-12 col-sm-12 col-xl-12">
          <div className="row">
            <KpiCard
              title="Sản lượng hôm nay"
              value={totalToday.toLocaleString('vi-VN')}
              sub="Tổng tất cả chuyền"
              icon="fe fe-package"
              gradient="bg-primary-gradient"
              shadow="box-shadow-primary"
            />
            <KpiCard
              title="Hoàn thành tháng"
              value={`${overallPct}%`}
              sub={`${totalMtd.toLocaleString('vi-VN')} SP tháng này`}
              subColor={overallPct >= 80 ? 'text-success' : 'text-warning'}
              icon="fe fe-trending-up"
              gradient={overallPct >= 80 ? 'bg-success-gradient' : 'bg-warning-gradient'}
              shadow={overallPct >= 80 ? 'box-shadow-success' : 'box-shadow-secondary'}
            />
            <KpiCard
              title="Mã hàng trễ tiến độ"
              value={lateCount}
              sub={lateCount > 0 ? 'Cần chú ý ngay' : 'Đúng tiến độ'}
              subColor={lateCount > 0 ? 'text-danger' : 'text-success'}
              icon="fe fe-alert-triangle"
              gradient={lateCount > 0 ? 'bg-danger-gradient' : 'bg-success-gradient'}
              shadow={lateCount > 0 ? 'box-shadow-danger' : 'box-shadow-success'}
            />
            <KpiCard
              title="Máy đang hỏng"
              value={brokenCnt}
              sub={brokenCnt > 0 ? 'Cần sửa chữa' : 'Hoạt động tốt'}
              subColor={brokenCnt > 0 ? 'text-danger' : 'text-success'}
              icon="fe fe-tool"
              gradient={brokenCnt > 0 ? 'bg-danger-gradient' : 'bg-secondary-gradient'}
              shadow={brokenCnt > 0 ? 'box-shadow-danger' : 'box-shadow-secondary'}
            />
          </div>
        </div>
      </div>

      {/* ROW 2 — FACTORY CHART + CUSTOMER PIE */}
      <div className="row">
        {kpi?.factoryStats && kpi.factoryStats.length > 0 ? (
          <FactoryChart data={kpi.factoryStats} />
        ) : (
          <div className="col-sm-12 col-md-12 col-lg-12 col-xl-8">
            <div className="card">
              <div className="card-header"><h3 className="card-title">Hiệu suất xưởng</h3></div>
              <div className="card-body d-flex align-items-center justify-content-center" style={{ height: 260 }}>
                <div className="text-center text-muted">
                  <i className="fe fe-bar-chart-2" style={{ fontSize: 40, opacity: 0.3 }}></i>
                  <p className="mt-2 mb-0">Chưa có dữ liệu</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {kpi?.customerStats && kpi.customerStats.length > 0 ? (
          <CustomerChart data={kpi.customerStats} />
        ) : (
          <div className="col-sm-12 col-md-12 col-lg-12 col-xl-4">
            <div className="card custom-card">
              <div className="card-header"><h3 className="card-title">Sản lượng theo KH</h3></div>
              <div className="card-body d-flex align-items-center justify-content-center" style={{ height: 260 }}>
                <div className="text-center text-muted">
                  <i className="fe fe-pie-chart" style={{ fontSize: 40, opacity: 0.3 }}></i>
                  <p className="mt-2 mb-0">Chưa có dữ liệu</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ROW 3 — STYLE PROGRESS + LINE EFFICIENCY */}
      <div className="row">
        {kpi?.styleStats && kpi.styleStats.length > 0 ? (
          <StyleProgressChart data={kpi.styleStats} />
        ) : (
          <div className="col-xl-4 col-md-12">
            <div className="card overflow-hidden">
              <div className="card-header"><h3 className="card-title">Tiến độ mã hàng</h3></div>
              <div className="card-body d-flex align-items-center justify-content-center" style={{ height: 220 }}>
                <div className="text-center text-muted">
                  <i className="fe fe-list" style={{ fontSize: 40, opacity: 0.3 }}></i>
                  <p className="mt-2 mb-0">Chưa có dữ liệu</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {kpi?.lineEfficiencies && kpi.lineEfficiencies.length > 0 ? (
          <LineEfficiencyChart data={kpi.lineEfficiencies} />
        ) : (
          <div className="col-xl-8 col-md-12">
            <div className="card">
              <div className="card-header"><h3 className="card-title">Hiệu suất chuyền hôm nay</h3></div>
              <div className="card-body d-flex align-items-center justify-content-center" style={{ height: 220 }}>
                <div className="text-center text-muted">
                  <i className="fe fe-activity" style={{ fontSize: 40, opacity: 0.3 }}></i>
                  <p className="mt-2 mb-0">Chưa có dữ liệu</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}
