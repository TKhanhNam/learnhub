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
  const href = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = href
  a.download = filename
  a.click()
  URL.revokeObjectURL(href)
}
