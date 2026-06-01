export default function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Chào mừng đến hệ thống quản lý sản xuất Tuấn Đạt.
      </p>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['Xưởng sản xuất', 'Chuyền may', 'Máy móc', 'Đơn hàng (PO)'].map((label) => (
          <div key={label} className="rounded-xl border bg-card p-5 shadow-sm">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-bold text-primary">—</p>
          </div>
        ))}
      </div>
    </div>
  )
}
