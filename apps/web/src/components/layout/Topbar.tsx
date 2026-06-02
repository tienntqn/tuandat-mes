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

          {/* Sidebar toggle - hamburger button */}
          <a
            aria-label="Hide Sidebar"
            className="app-sidebar__toggle"
            data-bs-toggle="sidebar"
            href="javascript:void(0);"
          ></a>

          {/* Mobile responsive logo */}
          <div className="responsive-logo">
            <a href="/" className="header-logo">
              <span className="mobile-logo logo-1" style={{ fontWeight: 700, color: '#6259ca', fontSize: '1rem' }}>TĐ MES</span>
            </a>
          </div>

          {/* Desktop horizontal logo */}
          <a className="logo-horizontal" href="/">
            <span className="header-brand-img desktop-logo" style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              Tuấn Đạt MES
            </span>
            <span className="header-brand-img light-logo1" style={{ fontWeight: 700, color: '#6259ca', fontSize: '1.1rem', whiteSpace: 'nowrap' }}>
              Tuấn Đạt MES
            </span>
          </a>

          {/* Search bar (desktop only) */}
          <div className="main-header-center ms-3 d-none d-lg-block">
            <input className="form-control" placeholder="Tìm kiếm..." type="search" />
            <button className="btn"><i className="fa fa-search" aria-hidden="true"></i></button>
          </div>

          <div className="d-flex order-lg-2 ms-auto header-right-icons">

            {/* Mobile navbar toggler */}
            <button
              className="navbar-toggler navresponsive-toggler d-lg-none ms-auto"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#navbarSupportedContent-4"
              aria-controls="navbarSupportedContent-4"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon fe fe-more-vertical text-dark"></span>
            </button>

            <div className="navbar navbar-collapse responsive-navbar p-0">
              <div className="collapse navbar-collapse" id="navbarSupportedContent-4">
                <div className="d-flex order-lg-2">

                  {/* Mobile search dropdown */}
                  <div className="dropdown d-block d-lg-none">
                    <a href="javascript:void(0);" className="nav-link icon" data-bs-toggle="dropdown">
                      <i className="fe fe-search"></i>
                    </a>
                    <div className="dropdown-menu header-search dropdown-menu-start">
                      <div className="input-group w-100 p-2">
                        <input type="text" className="form-control" placeholder="Tìm kiếm..." />
                        <div className="input-group-text btn btn-primary">
                          <i className="fa fa-search" aria-hidden="true"></i>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dark/Light mode toggle */}
                  <div className="dropdown d-md-flex">
                    <a className="nav-link icon theme-layout nav-link-bg layout-setting" href="javascript:void(0);">
                      <span className="dark-layout"><i className="fe fe-moon"></i></span>
                      <span className="light-layout"><i className="fe fe-sun"></i></span>
                    </a>
                  </div>

                  {/* Fullscreen toggle */}
                  <div className="dropdown d-md-flex">
                    <a className="nav-link icon full-screen-link nav-link-bg" href="javascript:void(0);">
                      <i className="fe fe-minimize fullscreen-button" id="myvideo"></i>
                    </a>
                  </div>

                  {/* Notifications */}
                  <div className="dropdown d-md-flex notifications">
                    <a className="nav-link icon" data-bs-toggle="dropdown" href="javascript:void(0);">
                      <i className="fe fe-bell"></i>
                      {highAlerts.length > 0 && <span className="pulse"></span>}
                      {highAlerts.length === 0 && <span className="pulse bg-success"></span>}
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
                            <div className={`me-3 notifyimg brround box-shadow-primary ${alert.severity === 'HIGH' ? 'bg-danger-gradient' : 'bg-warning-gradient'}`}>
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

                  {/* Message / alerts dropdown */}
                  <div className="dropdown d-md-flex message">
                    <a className="nav-link icon text-center" data-bs-toggle="dropdown" href="javascript:void(0);">
                      <i className="fe fe-message-square"></i>
                      <span className="pulse-danger"></span>
                    </a>
                    <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                      <div className="drop-heading border-bottom">
                        <div className="d-flex">
                          <h6 className="mt-1 mb-0 fs-16 fw-semibold">Thông báo</h6>
                          <div className="ms-auto">
                            <span className="badge bg-danger rounded-pill">0</span>
                          </div>
                        </div>
                      </div>
                      <div className="message-menu">
                        <div className="dropdown-item text-muted text-center py-3">Không có thông báo mới</div>
                      </div>
                    </div>
                  </div>

                  {/* User profile dropdown */}
                  <div className="dropdown d-md-flex profile-1">
                    <a
                      href="javascript:void(0);"
                      data-bs-toggle="dropdown"
                      className="nav-link leading-none d-flex px-1"
                    >
                      <span
                        className="avatar profile-user brround cover-image"
                        style={{
                          backgroundColor: '#6259ca',
                          color: '#fff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 700,
                          fontSize: '0.9rem',
                          width: '2rem',
                          height: '2rem',
                          borderRadius: '50%',
                        }}
                      >
                        {initial}
                      </span>
                    </a>
                    <div className="dropdown-menu dropdown-menu-end dropdown-menu-arrow">
                      <div className="drop-heading">
                        <div className="text-center">
                          <h5 className="text-dark mb-0 fs-14 fw-semibold">{user?.fullName}</h5>
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

                  {/* Right settings sidebar toggle */}
                  <div className="dropdown d-md-flex header-settings">
                    <a
                      href="javascript:void(0);"
                      className="nav-link icon"
                      data-bs-toggle="sidebar-right"
                      data-target=".sidebar-right"
                    >
                      <i className="fe fe-menu"></i>
                    </a>
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
