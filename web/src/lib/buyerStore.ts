export type PayMethod = 'momo' | 'on-access'
export type OrderStatus = 'held' | 'cancelled' | 'received' | 'complaint' | 'refunded'

export interface CourseOrder {
  id: string
  slug: string
  title: string
  instructorId: number
  shop: string
  price: number
  discount: number
  total: number
  method: PayMethod
  status: OrderStatus
  voucher: string | null
  voucherKind: 'platform' | 'shop' | null
  at: string
}

export interface ShopVoucher {
  id: string
  code: string
  percent: number
  max: number
  used: number
}

export interface ListingEdit {
  title: string
  price: number
  description: string
}

interface SellerProfile {
  fullName: string
  idNumber: string
  kyc: 'none' | 'pending' | 'verified'
  bank: string
  accountNumber: string
  accountName: string
}

interface Bag {
  favorites: string[]
  orders: CourseOrder[]
  admin: { id: string; from: 'me' | 'admin'; text: string }[]
  vouchers: ShopVoucher[]
  platformVouchers: ShopVoucher[]
  edits: Record<string, ListingEdit>
  adsTaken: number
  adMax: number
  hidden: string[]
  origins: Record<string, 'pending' | 'original' | 'cited' | 'copied'>
  wallet: { id: string; name: string; kind: 'deposit' | 'withdraw'; amount: number; status: 'pending' | 'done' }[]
  categories: string[]
  seller: SellerProfile
}

const KEY = 'lh-buyer'
export const AD_SLOTS = 3
export const PLATFORM_FEE = 0.3

function empty(): Bag {
  return {
    favorites: [],
    orders: [],
    admin: [],
    vouchers: [{ id: 'v1', code: 'SHOP10', percent: 10, max: 5, used: 0 }],
    platformVouchers: [{ id: 'p1', code: 'LEARNHUB20', percent: 20, max: 100, used: 0 }],
    edits: {},
    adsTaken: 2,
    adMax: 3,
    hidden: [],
    origins: {},
    wallet: [],
    categories: ['Lập trình', 'Ngoại ngữ', 'Thiết kế', 'Tin học'],
    seller: { fullName: '', idNumber: '', kyc: 'none', bank: '', accountNumber: '', accountName: '' },
  }
}

function read(): Bag {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    return { ...empty(), ...JSON.parse(raw) }
  } catch {
    return empty()
  }
}

function write(bag: Bag) {
  localStorage.setItem(KEY, JSON.stringify(bag))
}

function nid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function favorites() {
  return read().favorites
}

export function toggleFavorite(slug: string) {
  const bag = read()
  bag.favorites = bag.favorites.includes(slug)
    ? bag.favorites.filter((item) => item !== slug)
    : [...bag.favorites, slug]
  write(bag)
  return bag.favorites
}

export function orders() {
  return read().orders
}

export function quoteVoucher(code: string, price: number) {
  const trimmed = code.trim().toUpperCase()
  if (!trimmed) return { percent: 0, kind: null as 'platform' | 'shop' | null, code: null as string | null, message: '' }
  if (trimmed === 'LEARNHUB20' || read().platformVouchers.some((item) => item.code.toUpperCase() === trimmed)) {
    const row = read().platformVouchers.find((item) => item.code.toUpperCase() === trimmed)
    const percent = row?.percent ?? (trimmed === 'LEARNHUB20' ? 20 : 0)
    if (row && row.used >= row.max) return { percent: 0, kind: 'platform' as const, code: trimmed, message: 'Voucher sàn đã hết suất' }
    return { percent, kind: 'platform' as const, code: trimmed, message: `Voucher sàn ${percent}%` }
  }
  const row = read().vouchers.find((item) => item.code.toUpperCase() === trimmed)
  if (!row) return { percent: 0, kind: null, code: trimmed, message: 'Không có voucher này' }
  if (row.used >= row.max) return { percent: 0, kind: 'shop' as const, code: trimmed, message: 'Voucher shop đã hết lượt' }
  return { percent: row.percent, kind: 'shop' as const, code: trimmed, message: `Voucher shop ${row.percent}%` }
}

export function placeOrder(input: {
  slug: string
  title: string
  instructorId: number
  shop: string
  price: number
  method: PayMethod
  code: string
}) {
  const quote = quoteVoucher(input.code, input.price)
  const discount = Math.round(input.price * quote.percent / 100)
  const bag = read()
  if (quote.kind === 'shop' && quote.code) {
    const row = bag.vouchers.find((item) => item.code.toUpperCase() === quote.code)
    if (row) row.used += 1
  }
  if (quote.kind === 'platform' && quote.code) {
    const row = bag.platformVouchers.find((item) => item.code.toUpperCase() === quote.code)
    if (row) row.used += 1
  }
  const order: CourseOrder = {
    id: nid(),
    slug: input.slug,
    title: input.title,
    instructorId: input.instructorId,
    shop: input.shop,
    price: input.price,
    discount,
    total: input.price - discount,
    method: input.method,
    status: 'held',
    voucher: quote.percent ? quote.code : null,
    voucherKind: quote.percent ? quote.kind : null,
    at: new Date().toISOString(),
  }
  bag.orders.unshift(order)
  write(bag)
  return order
}

export function setOrderStatus(id: string, status: OrderStatus) {
  const bag = read()
  const row = bag.orders.find((item) => item.id === id)
  if (!row) return
  if (status === 'refunded' && row.method !== 'momo') return
  if (status === 'cancelled' && row.status !== 'held') return
  if (status === 'received' && row.status !== 'held' && row.status !== 'complaint') return
  row.status = status
  write(bag)
}

export function adminThread() {
  return read().admin
}

export function sendAdmin(text: string) {
  const bag = read()
  bag.admin.push({ id: nid(), from: 'me', text: text.trim() })
  bag.admin.push({
    id: nid(),
    from: 'admin',
    text: 'Admin LearnHub đã nhận tin. Khóa học không giao qua GHN, admin chỉ xử lý mở khóa, khiếu nại và hoàn MoMo.',
  })
  write(bag)
  return bag.admin
}

export function vouchers() {
  return read().vouchers
}

export function addVoucher(code: string, percent: number, max: number) {
  const bag = read()
  bag.vouchers.push({ id: nid(), code: code.trim().toUpperCase(), percent, max, used: 0 })
  write(bag)
}

export function listingEdit(slug: string) {
  return read().edits[slug]
}

export function saveListing(slug: string, edit: ListingEdit) {
  const bag = read()
  bag.edits[slug] = edit
  write(bag)
}

export function withEdits<T extends { slug: string; title: string; price: number; description: string }>(offers: T[]) {
  const edits = read().edits
  return offers.map((item) => (edits[item.slug] ? { ...item, ...edits[item.slug] } : item))
}

export function adsTaken() {
  return read().adsTaken
}

export function registerAd() {
  const bag = read()
  if (bag.adsTaken >= bag.adMax) return false
  bag.adsTaken += 1
  write(bag)
  return true
}

export function adLimit() {
  return read().adMax
}

export function setAdLimit(max: number) {
  const bag = read()
  bag.adMax = Math.max(1, max)
  write(bag)
}

export function hiddenSlugs() {
  return read().hidden
}

export function setHidden(slug: string, hidden: boolean) {
  const bag = read()
  bag.hidden = hidden ? [...new Set([...bag.hidden, slug])] : bag.hidden.filter((item) => item !== slug)
  write(bag)
}

export function originOf(slug: string) {
  return read().origins[slug] || 'pending'
}

export function setOrigin(slug: string, value: Bag['origins'][string]) {
  const bag = read()
  bag.origins[slug] = value
  write(bag)
}

export function walletRows() {
  return read().wallet
}

export function addWallet(name: string, kind: 'deposit' | 'withdraw', amount: number) {
  const bag = read()
  bag.wallet.unshift({ id: nid(), name, kind, amount, status: 'pending' })
  write(bag)
}

export function settleWallet(id: string) {
  const bag = read()
  const row = bag.wallet.find((item) => item.id === id)
  if (row) row.status = 'done'
  write(bag)
}

export function categoryNames() {
  return read().categories
}

export function addCategory(name: string) {
  const bag = read()
  const trimmed = name.trim()
  if (trimmed && !bag.categories.includes(trimmed)) bag.categories.push(trimmed)
  write(bag)
}

export function platformVouchers() {
  return read().platformVouchers
}

export function addPlatformVoucher(code: string, percent: number, max: number) {
  const bag = read()
  bag.platformVouchers.push({ id: nid(), code: code.trim().toUpperCase(), percent, max, used: 0 })
  write(bag)
}

export function postAdmin(text: string) {
  const bag = read()
  bag.admin.push({ id: nid(), from: 'admin', text: text.trim() })
  write(bag)
}

export function seller() {
  return read().seller
}

export function saveSeller(next: SellerProfile) {
  const bag = read()
  bag.seller = next
  write(bag)
}

const KYC_KEY = 'lh-kyc'

export interface KycRecord extends SellerProfile {
  userId: number
  username: string
  submittedAt?: string
}

function readKyc(): Record<string, KycRecord> {
  try {
    const raw = localStorage.getItem(KYC_KEY)
    return raw ? JSON.parse(raw) as Record<string, KycRecord> : {}
  } catch {
    return {}
  }
}

function writeKyc(rows: Record<string, KycRecord>) {
  localStorage.setItem(KYC_KEY, JSON.stringify(rows))
}

function asProfile(row: SellerProfile): SellerProfile {
  return {
    fullName: row.fullName || '',
    idNumber: row.idNumber || '',
    kyc: row.kyc || 'none',
    bank: row.bank || '',
    accountNumber: row.accountNumber || '',
    accountName: row.accountName || '',
  }
}

export function kycOf(userId: number): SellerProfile {
  const row = readKyc()[String(userId)]
  if (row) return asProfile(row)
  return { fullName: '', idNumber: '', kyc: 'none', bank: '', accountNumber: '', accountName: '' }
}

export function saveKycFor(userId: number, username: string, next: SellerProfile) {
  const all = readKyc()
  all[String(userId)] = {
    ...asProfile(next),
    userId,
    username,
    submittedAt: new Date().toISOString(),
  }
  writeKyc(all)
  saveSeller(next)
}

export function kycQueue(): KycRecord[] {
  const all = Object.values(readKyc())
  const legacy = seller()
  if (legacy.kyc !== 'none' && (legacy.fullName || legacy.accountNumber)
    && !all.some((row) => row.fullName === legacy.fullName && row.accountNumber === legacy.accountNumber)) {
    all.push({ ...asProfile(legacy), userId: 0, username: '', submittedAt: '' })
  }
  return all.sort((a, b) => Number(b.submittedAt ? Date.parse(b.submittedAt) : 0) - Number(a.submittedAt ? Date.parse(a.submittedAt) : 0))
}

export function approveKyc(userId: number) {
  const all = readKyc()
  const key = String(userId)
  if (all[key]) {
    all[key] = { ...all[key], kyc: 'verified' }
    writeKyc(all)
  }
  const legacy = seller()
  const row = all[key]
  if (userId === 0 || (row && legacy.accountNumber === row.accountNumber && legacy.fullName === row.fullName)) {
    saveSeller({ ...legacy, kyc: 'verified' })
  }
}

export function ledger(rows = orders()) {
  const released = rows.filter((item) => item.status === 'received')
  const gross = released.reduce((sum, item) => sum + item.total, 0)
  const fee = Math.round(gross * PLATFORM_FEE)
  return { gross, fee, net: gross - fee, released }
}
