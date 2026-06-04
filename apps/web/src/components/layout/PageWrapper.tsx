import React from 'react'
import { SectionTabs } from './SectionTabs'

interface Crumb {
  label: string
  href?: string
}

interface PageWrapperProps {
  title: string
  breadcrumbs?: Crumb[]
  actions?: React.ReactNode
  children: React.ReactNode
}

/**
 * Wrapper chuẩn Zanex cho mọi trang nội dung.
 * Cung cấp main-container, page-header với breadcrumb và nút action.
 */
export function PageWrapper({ title, breadcrumbs = [], actions, children }: PageWrapperProps) {
  return (
    <div className="main-container container-fluid">

      {/* PAGE HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{title}</h1>
          <ol className="breadcrumb">
            <li className="breadcrumb-item">
              <a href="javascript:void(0);">Trang chủ</a>
            </li>
            {breadcrumbs.map((crumb, i) => (
              <li
                key={i}
                className={`breadcrumb-item${i === breadcrumbs.length - 1 ? ' active' : ''}`}
                aria-current={i === breadcrumbs.length - 1 ? 'page' : undefined}
              >
                {crumb.href && i < breadcrumbs.length - 1
                  ? <a href={crumb.href}>{crumb.label}</a>
                  : crumb.label
                }
              </li>
            ))}
          </ol>
        </div>
        {actions && (
          <div className="ms-auto pageheader-btn">
            {actions}
          </div>
        )}
      </div>

      {/* Hàng tab cấp-3 (menu con cùng nhóm) ngay dưới breadcrumb */}
      <SectionTabs />

      {children}
    </div>
  )
}
