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

export function downloadRows(filename: string, sheet: string, headers: string[], rows: (string | number)[][]) {
  const esc = (value: string | number) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  const cells = (values: (string | number)[]) => values.map((value) => {
    const type = typeof value === 'number' ? 'Number' : 'String'
    return `<Cell><Data ss:Type="${type}">${esc(value)}</Data></Cell>`
  }).join('')
  const xml = `<?xml version="1.0"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
<Worksheet ss:Name="${esc(sheet)}"><Table>
<Row>${cells(headers)}</Row>
${rows.map((row) => `<Row>${cells(row)}</Row>`).join('')}
</Table></Worksheet></Workbook>`
  saveBlob(new Blob([xml], { type: 'application/vnd.ms-excel' }), filename)
}

function saveBlob(blob: Blob, filename: string) {
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}
