import { useAuthStore } from '@/stores/auth.store'
import { useLogout } from '@/features/auth/auth.hooks'
import { useAlerts } from '@/features/report/report.hooks'

export function Topbar() {
  const { user } = useAuthStore()
  const logout = useLogout()
  const { data: alerts = [] } = useAlerts()
  const highAlerts = alerts.filter((a) => a.severity === 'HIGH')

  const initial = user?.fullName?.charAt(0)?.toUpperCase() ?? 'U'

  return (
    <div className="app-header header sticky">
      <div className="container-fluid main-container">
        <div className="d-flex align-items-center">

          {/* Mobile sidebar toggle */}
          <a
            aria-label="Mở sidebar"
            className="app-sidebar__toggle"
            data-bs-toggle="sidebar"
            href="javascript:void(0);"
          ></a>

          {/* Logo (responsive) */}
          <div className="responsive-logo">
            <a href="/" className="header-logo">
              <span style={{ fontWeight: 700, color: '#fff', fontSize: '1rem' }}>TĐ MES</span>
            </a>
          </div>

          {/* Desktop logo text */}
          <a className="logo-horizontal" href="/">
            <span className="header-brand-img desktop-logo" style={{ fontWeight: 700, color: '#fff', fontSize: '1.1rem' }}>
              Tuấn Đạt MES
            </span>
          </a>

          <div className="d-flex order-lg-2 ms-auto header-right-icons">
            <div className="navbar navbar-collapse responsive-navbar p-0">
              <div className="collapse navbar-collapse" id="navbarSupportedContent-4">
                <div className="d-flex order-lg-2">

                  {/* Dark/Light mode toggle */}
                  <div className="dropdown d-md-flex">
                    <a className="nav-link icon theme-layout nav-link-bg layout-setting" href="javascript:void(0);">
                      <span className="dark-layout"><i className="fe fe-moon"></i></span>
                      <span className="light-layout"><i className="fe fe-sun"></i></span>
                    </a>
                  </div>

                  {/* Notifications */}
                  <div className="dropdown d-md-flex notifications">
                    <a className="nav-link icon" data-bs-toggle="dropdown" href="javascript:void(0);">
                      <i className="fe fe-bell"></i>
                      {highAlerts.length > 0 && <span className="pulse"></span>}
                    </a>
                    <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                      <div className="drop-heading border-bottom">
                        <div className="d-flex">
                          <h6 className="mt-1 mb-0 fs-16 fw-semibold">Cảnh báo hệ thống</h6>
                          {alerts.length > 0 && (
                            <div className="ms-auto">
                              <span className="badge bg-danger rounded-pill">{alerts.length}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="notifications-menu">
                        {alerts.length === 0 && (
                          <div className="dropdown-item text-muted text-center py-3">Không có cảnh báo</div>
                        )}
                        {alerts.slice(0, 5).map((alert, i) => (
                          <a key={i} className="dropdown-item d-flex" href="javascript:void(0);">
                            <div className={`me-3 notifyimg brround ${alert.severity === 'HIGH' ? 'bg-danger-gradient' : 'bg-warning-gradient'}`}>
                              <i className="fe fe-alert-triangle"></i>
                            </div>
                            <div className="mt-1 wd-80p">
                              <h5 className="notification-label mb-1">{alert.title}</h5>
                              <span className="notification-subtext">{alert.description}</span>
                            </div>
                          </a>
                        ))}
                      </div>
                      {alerts.length > 5 && (
                        <>
                          <div className="dropdown-divider m-0"></div>
                          <a href="/reports" className="dropdown-item text-center p-3 text-muted">
                            Xem tất cả ({alerts.length})
                          </a>
                        </>
                      )}
                    </div>
                  </div>

                  {/* User dropdown */}
                  <div className="dropdown d-md-flex profile-1">
                    <a
                      href="javascript:void(0);"
                      data-bs-toggle="dropdown"
                      className="nav-link leading-none d-flex px-1"
                    >
                      <span
                        className="avatar profile-user brround"
                        style={{
                          backgroundColor: '#5c67f2',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                        }}
                      >
                        {initial}
                      </span>
                    </a>
                    <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                      <div className="drop-heading">
                        <div className="text-center">
                          <h5 className="text-dark mb-0">{user?.fullName}</h5>
                          <small className="text-muted">{user?.position}</small>
                        </div>
                      </div>
                      <div className="dropdown-divider m-0"></div>
                      <button
                        className="dropdown-item"
                        onClick={logout}
                      >
                        <i className="dropdown-icon fe fe-log-out"></i> Đăng xuất
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
