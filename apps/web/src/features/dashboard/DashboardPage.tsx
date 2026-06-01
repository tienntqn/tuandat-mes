import { useCallback, useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, RadialBarChart, RadialBar,
} from 'recharts'
import { AlertTriangle, TrendingUp, Package, Wrench, Factory, BarChart3 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { useKpi, useKpiStream } from '@/features/report/report.hooks'
import { type KpiResult } from '@/features/report/report.api'
import { cn } from '@/lib/utils'

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

// ============================================================
// KPI Cards
// ============================================================

interface KpiCardProps {
  title: string
  value: string | number
  sub?: string
  icon: React.ElementType
  variant?: 'default' | 'warning' | 'danger' | 'success'
}

function KpiCard({ title, value, sub, icon: Icon, variant = 'default' }: KpiCardProps) {
  const iconColor = {
    default: 'text-blue-500',
    warning: 'text-amber-500',
    danger: 'text-red-500',
    success: 'text-green-500',
  }[variant]

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="mt-1 text-3xl font-bold">{value}</p>
            {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
          </div>
          <div className={cn('rounded-full bg-muted p-2', iconColor)}>
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Charts
// ============================================================

function FactoryChart({ data }: { data: KpiResult['factoryStats'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">So sánh hiệu suất xưởng</CardTitle>
        <CardDescription>Kế hoạch vs Thực tế (SP)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis dataKey="factoryName" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip
              formatter={(value: number) => value.toLocaleString('vi-VN')}
              labelStyle={{ fontWeight: 'bold' }}
            />
            <Legend />
            <Bar dataKey="plannedQty" name="Kế hoạch" fill="#94a3b8" radius={[4, 4, 0, 0]} />
            <Bar dataKey="actualQty" name="Thực tế" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function CustomerChart({ data }: { data: KpiResult['customerStats'] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Sản lượng theo khách hàng</CardTitle>
        <CardDescription>Tỷ lệ tổng sản lượng theo KH</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={data}
              dataKey="actualQty"
              nameKey="customerName"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ customerName, pct }) => `${customerName} ${pct}%`}
              labelLine={false}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(v: number) => v.toLocaleString('vi-VN')} />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

function StyleProgressChart({ data }: { data: KpiResult['styleStats'] }) {
  const sorted = [...data].sort((a, b) => b.pct - a.pct).slice(0, 10)
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Tiến độ theo mã hàng (Top 10)</CardTitle>
        <CardDescription>% hoàn thành kế hoạch</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2.5">
          {sorted.map((s) => (
            <div key={s.styleId}>
              <div className="flex justify-between text-sm mb-1">
                <span className={cn('font-medium', s.isLate && 'text-red-600')}>
                  {s.styleCode}
                  {s.isLate && (
                    <AlertTriangle className="inline ml-1 h-3.5 w-3.5 text-red-500" />
                  )}
                </span>
                <span className="text-muted-foreground">{s.pct}%</span>
              </div>
              <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    s.isLate ? 'bg-red-500' : s.pct >= 100 ? 'bg-green-500' : 'bg-blue-500',
                  )}
                  style={{ width: `${Math.min(s.pct, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function LineEfficiencyChart({ data }: { data: KpiResult['lineEfficiencies'] }) {
  const chartData = data.map((l) => ({
    name: l.lineName,
    factory: l.factoryName,
    hieuSuat: l.efficiencyPct,
    sanLuong: l.outputToday,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Hiệu suất chuyền hôm nay</CardTitle>
        <CardDescription>SAM-weighted efficiency (%)</CardDescription>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 20 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} className="opacity-30" />
            <XAxis type="number" domain={[0, 120]} tick={{ fontSize: 11 }} unit="%" />
            <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={70} />
            <Tooltip
              formatter={(v: number, name: string) =>
                name === 'hieuSuat' ? [`${v}%`, 'Hiệu suất'] : [v.toLocaleString('vi-VN'), 'Sản lượng']
              }
            />
            <Bar dataKey="hieuSuat" name="Hiệu suất" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (
                <Cell
                  key={i}
                  fill={d.hieuSuat >= 100 ? '#10b981' : d.hieuSuat >= 80 ? '#3b82f6' : '#ef4444'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================
// Main Dashboard
// ============================================================

export default function DashboardPage() {
  const { data: initialKpi, isLoading } = useKpi()
  const [liveKpi, setLiveKpi] = useState<KpiResult | null>(null)

  const handleStream = useCallback((kpi: KpiResult) => setLiveKpi(kpi), [])
  useKpiStream(handleStream)

  const kpi = liveKpi ?? initialKpi

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Dashboard Ban Giám đốc</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />)}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard Ban Giám đốc</h1>
          <p className="text-sm text-muted-foreground">
            Cập nhật tự động mỗi 30 giây
            {liveKpi && (
              <Badge variant="outline" className="ml-2 text-green-600 border-green-300">
                Live
              </Badge>
            )}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Sản lượng hôm nay"
          value={(kpi?.totalOutputToday ?? 0).toLocaleString('vi-VN')}
          sub="Tổng tất cả chuyền"
          icon={Package}
          variant="default"
        />
        <KpiCard
          title="Hoàn thành tháng"
          value={`${kpi?.overallPct ?? 0}%`}
          sub={`${(kpi?.totalOutputMtd ?? 0).toLocaleString('vi-VN')} SP tháng này`}
          icon={TrendingUp}
          variant={kpi && kpi.overallPct >= 80 ? 'success' : 'warning'}
        />
        <KpiCard
          title="Mã hàng trễ tiến độ"
          value={kpi?.lateStyleCount ?? 0}
          sub="Cần chú ý"
          icon={AlertTriangle}
          variant={kpi && kpi.lateStyleCount > 0 ? 'danger' : 'success'}
        />
        <KpiCard
          title="Máy đang hỏng"
          value={kpi?.brokenMachineCount ?? 0}
          sub="Cần sửa chữa"
          icon={Wrench}
          variant={kpi && kpi.brokenMachineCount > 0 ? 'danger' : 'success'}
        />
      </div>

      {/* Charts row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {kpi?.factoryStats && kpi.factoryStats.length > 0 ? (
          <FactoryChart data={kpi.factoryStats} />
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Hiệu suất xưởng</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
              <Factory className="h-8 w-8 opacity-30" />
            </CardContent>
          </Card>
        )}

        {kpi?.customerStats && kpi.customerStats.length > 0 ? (
          <CustomerChart data={kpi.customerStats} />
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Theo khách hàng</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
              <BarChart3 className="h-8 w-8 opacity-30" />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {kpi?.styleStats && kpi.styleStats.length > 0 ? (
          <StyleProgressChart data={kpi.styleStats} />
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Tiến độ mã hàng</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
              Chưa có dữ liệu
            </CardContent>
          </Card>
        )}

        {kpi?.lineEfficiencies && kpi.lineEfficiencies.length > 0 ? (
          <LineEfficiencyChart data={kpi.lineEfficiencies} />
        ) : (
          <Card>
            <CardHeader><CardTitle className="text-base">Hiệu suất chuyền</CardTitle></CardHeader>
            <CardContent className="flex items-center justify-center h-40 text-muted-foreground">
              Chưa có dữ liệu
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
