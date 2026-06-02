interface PaginationProps {
  page: number
  totalPages: number
  total: number
  pageSize: number
  onPageChange: (page: number) => void
}

export function Pagination({ page, totalPages, total, pageSize, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="d-flex align-items-center justify-content-between">
      <small className="text-muted">
        {from}–{to} / {total} bản ghi
      </small>
      <nav>
        <ul className="pagination pagination-sm mb-0">
          <li className={`page-item ${page <= 1 ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page - 1)}>
              <i className="fe fe-chevron-left"></i>
            </button>
          </li>
          <li className="page-item disabled">
            <span className="page-link">{page} / {totalPages}</span>
          </li>
          <li className={`page-item ${page >= totalPages ? 'disabled' : ''}`}>
            <button className="page-link" onClick={() => onPageChange(page + 1)}>
              <i className="fe fe-chevron-right"></i>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  )
}
