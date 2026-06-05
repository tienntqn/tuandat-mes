import type { Employee } from '@/features/employee/employee.api'

// Lấy số xưởng từ mã/tên xưởng (vd 'X1' → '1', 'Xưởng 2' → '2')
function factoryNum(emp: Pick<Employee, 'factory' | 'factoryId'>): string {
  const src = emp.factory?.code ?? emp.factory?.name ?? ''
  const m = src.match(/\d+/)
  return m ? m[0] : String(emp.factoryId ?? '')
}

/**
 * Sinh tên đăng nhập theo quy ước (trừ admin):
 *  - Giám đốc xưởng:   gdx.x{xưởng}      (gdx.x1)
 *  - Kế hoạch xưởng:   khx.x{xưởng}      (khx.x1)
 *  - Cơ điện:          cd.x{xưởng}       (cd.x1)
 *  - Tổ trưởng:        tt.x{xưởng}c{chuyền}  (tt.x1c1)
 *  - Tổ phó:           tp.x{xưởng}c{chuyền}  (tp.x1c1)
 *  - Tổ Hoàn thành:    ht.x{xưởng}       (ht.x1)
 *  - Tổ Cắt:           cat.x{xưởng}      (cat.x1)
 *  - Tổ KCS:           kcs.x{xưởng}      (kcs.x1)
 *  - Kế hoạch công ty: khct
 *  - Ban giám đốc:     bod
 *  Các trường hợp khác: mã NV viết thường.
 */
export function suggestUsername(emp: Employee): string {
  const fx = `x${factoryNum(emp)}`
  const ln = emp.line?.lineNumber
  switch (emp.position) {
    case 'FACTORY_DIRECTOR': return `gdx.${fx}`
    case 'FACTORY_PLANNER': return `khx.${fx}`
    case 'MECHANIC': return `cd.${fx}`
    case 'LINE_LEADER': return ln ? `tt.${fx}c${ln}` : `tt.${fx}`
    case 'LINE_DEPUTY': return ln ? `tp.${fx}c${ln}` : `tp.${fx}`
    case 'FINISHING_LEADER': return `ht.${fx}`
    case 'CUTTING_LEADER': return `cat.${fx}`
    case 'QC_LEADER': return `kcs.${fx}`
    case 'COMPANY_PLANNER': return 'khct'
    case 'BOD': return 'bod'
    default: return emp.code.toLowerCase()
  }
}
