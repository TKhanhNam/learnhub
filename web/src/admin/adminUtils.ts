import axiosClient from '../api/axiosClient'

export function money(value: number | string | undefined) {
  const n = Number(value || 0)
  return n.toLocaleString('vi-VN') + ' ₫'
}

export async function downloadExcel(url: string, filename: string) {
  const res = await axiosClient.get(url, { responseType: 'blob' })
  const blob = new Blob([res.data], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  saveBlob(blob, filename)
}

export interface ExcelSheetData {
  sheet: string
  headers: string[]
  rows: (string | number)[][]
}

export function downloadWorkbook(filename: string, sheets: ExcelSheetData[]) {
  const esc = (value: string | number) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const cells = (values: (string | number)[]) => values.map((value) => {
    const type = typeof value === 'number' ? 'Number' : 'String'
    return `<Cell><Data ss:Type="${type}">${esc(value)}</Data></Cell>`
  }).join('')

  const sheetsXml = sheets.map((s) => `
<Worksheet ss:Name="${esc(s.sheet)}"><Table>
<Row>${cells(s.headers)}</Row>
${s.rows.map((row) => `<Row>${cells(row)}</Row>`).join('')}
</Table></Worksheet>`).join('')

  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
${sheetsXml}
</Workbook>`
  saveBlob(new Blob([xml], { type: 'application/vnd.ms-excel' }), filename)
}

export function downloadRows(filename: string, sheet: string, headers: string[], rows: (string | number)[][]) {
  downloadWorkbook(filename, [{ sheet, headers, rows }])
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}
