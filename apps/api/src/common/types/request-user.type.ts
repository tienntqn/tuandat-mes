export type DataScope =
  | { type: 'COMPANY' }
  | { type: 'FACTORY'; factoryId: number }
  | { type: 'LINE'; lineId: number }

export interface RequestUser {
  id: number
  username: string
  employeeId: number
  position: string
  factoryId: number | null
  lineId: number | null
  roles: string[]
  permissions: string[]
  dataScope: DataScope
}
