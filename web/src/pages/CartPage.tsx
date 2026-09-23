import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import axiosClient from '../api/axiosClient'
import CartPaper, { type CartPaperData, type PaperLine } from '../components/CartPaper'
import { useAuth } from '../context/AuthContext'
import { useI18n } from '../context/I18nContext'

interface Item {
  id: number
  courseId: number
  title: string
  price: number
  aiAssistEnabled?: boolean
}

interface PaidOrder {
  id: number
  items: { title: string; price: number }[]
  subtotal: number
  discount: number
  total: number
  couponCode: string | null
}

type CouponState =
  | { status: 'idle' }
  | { status: 'checking' }
  | { status: 'valid'; percent: number; message: string }
  | { status: 'invalid'; message: string }

const PAPER_ROWS = 4

const vnd = (n: number) => `${Math.round(Number(n) || 0).toLocaleString('vi-VN')} ₫`

export default function CartPage() {
  const { t, locale } = useI18n()
  const { user } = useAuth()
  const vi = locale === 'vi'
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [subtotal, setSubtotal] = useState(0)
  const [coupon, setCoupon] = useState('LEARNHUB20')
  const [couponState, setCouponState] = useState<CouponState>({ status: 'idle' })
  const [gift, setGift] = useState(false)
  const [email, setEmail] = useState('')
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [paid, setPaid] = useState<PaidOrder | null>(null)

  const load = () => {
    axiosClient.get('/api/commerce/cart').then((res) => {
      setItems(res.data.data?.items || [])
      setSubtotal(res.data.data?.subtotal || 0)
    }).catch((err) => setMsg(err.response?.data?.message || (vi ? 'Lỗi giỏ hàng' : 'Cart error')))
  }

  useEffect(() => { load() }, [])

  // The backend validates the code against the first course in the cart, so
  // the preview has to ask the same question to stay honest.
  const firstCourseId = items[0]?.courseId
  useEffect(() => {
    const code = coupon.trim()
    if (!code || !firstCourseId) {
      setCouponState({ status: 'idle' })
      return
    }
    let cancelled = false
    setCouponState({ status: 'checking' })
    const timer = setTimeout(() => {
      axiosClient
        .get('/api/catalog/coupons/preview', { params: { code, courseId: firstCourseId } })
        .then((res) => {
          if (cancelled) return
          const data = res.data.data as { valid: boolean; discountPercent?: number; message?: string }
          setCouponState(data?.valid
            ? { status: 'valid', percent: Number(data.discountPercent || 0), message: data.message || '' }
            : { status: 'invalid', message: data?.message || (vi ? 'Mã không hợp lệ' : 'Invalid code') })
        })
        .catch(() => {
          if (!cancelled) setCouponState({ status: 'invalid', message: vi ? 'Không kiểm tra được mã' : 'Could not verify code' })
        })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [coupon, firstCourseId, vi])

  const percent = couponState.status === 'valid' ? couponState.percent : 0
  const discount = Math.round(subtotal * percent) / 100
  const total = Math.max(0, subtotal - discount)

  const paper = useMemo<CartPaperData>(() => {
    const buyer = user?.fullName || (vi ? 'Học viên LearnHub' : 'LearnHub learner')
    const issuedOn = new Date().toLocaleDateString(vi ? 'vi-VN' : 'en-GB')

    if (paid) {
      return {
        wordmark: 'LEARNHUB',
        brand: vi ? 'HỌC VIỆN TRỰC TUYẾN LEARNHUB' : 'LEARNHUB ONLINE ACADEMY',
        title: vi ? 'Biên nhận' : 'Receipt',
        subtitle: vi ? 'đã thanh toán' : 'paid in full',
        buyerLabel: vi ? 'CẤP CHO' : 'ISSUED TO',
        buyer,
        note: vi
          ? 'Các khóa học dưới đây đã được thêm vào tài khoản của bạn, sở hữu trọn đời.'
          : 'The courses below are now in your library with lifetime access.',
        itemsLabel: vi ? 'KHÓA HỌC' : 'COURSE',
        priceLabel: vi ? 'HỌC PHÍ' : 'PRICE',
        items: paid.items.slice(0, PAPER_ROWS).map((item) => ({
          title: item.title,
          meta: vi ? 'Đã kích hoạt · sở hữu trọn đời' : 'Activated · lifetime access',
          price: vnd(item.price),
        })),
        moreText: paid.items.length > PAPER_ROWS
          ? `+ ${paid.items.length - PAPER_ROWS} ${vi ? 'khóa khác' : 'more'}`
          : '',
        emptyText: '',
        lines: [
          { label: vi ? 'Tạm tính' : 'Subtotal', value: vnd(paid.subtotal) },
          ...(paid.discount > 0
            ? [{ label: `${vi ? 'Giảm giá' : 'Discount'}${paid.couponCode ? ` · ${paid.couponCode}` : ''}`, value: `− ${vnd(paid.discount)}`, tone: 'discount' as const }]
            : []),
        ],
        totalLabel: vi ? 'ĐÃ THANH TOÁN' : 'AMOUNT PAID',
        total: vnd(paid.total),
        issued: `${vi ? 'ĐƠN HÀNG' : 'ORDER'} #${paid.id} · ${issuedOn}`,
        signer: 'LearnHub',
        signerRole: vi ? 'PHÒNG HỌC VỤ' : 'ACADEMIC OFFICE',
        sealMark: 'L',
        sealSub: vi ? 'ĐÃ THANH TOÁN' : 'PAID',
      }
    }

    const lines: PaperLine[] = [{ label: vi ? 'Tạm tính' : 'Subtotal', value: vnd(subtotal) }]
    if (discount > 0) {
      lines.push({
        label: `${vi ? 'Giảm giá' : 'Discount'} ${percent}% · ${coupon.trim().toUpperCase()}`,
        value: `− ${vnd(discount)}`,
        tone: 'discount',
      })
    }

    return {
      wordmark: 'LEARNHUB',
      brand: vi ? 'HỌC VIỆN TRỰC TUYẾN LEARNHUB' : 'LEARNHUB ONLINE ACADEMY',
      title: vi ? 'Phiếu thanh toán' : 'Order sheet',
      subtitle: vi ? 'đơn hàng khóa học' : 'course purchase',
      buyerLabel: vi ? 'LẬP CHO' : 'PREPARED FOR',
      buyer,
      note: gift && email
        ? (vi ? `Món quà này sẽ được gửi tới ${email} ngay sau khi thanh toán.` : `This gift will be delivered to ${email} right after checkout.`)
        : (vi
          ? 'Kéo tờ phiếu để lật, di chuột để rọi sáng. Mã giảm giá trên tấm giấy bên phải sẽ in lại số tiền ngay.'
          : 'Drag the sheet to turn it, hover to light it. The coupon on the plaque reprints the amounts.'),
      itemsLabel: vi ? 'KHÓA HỌC' : 'COURSE',
      priceLabel: vi ? 'HỌC PHÍ' : 'PRICE',
      items: items.slice(0, PAPER_ROWS).map((item) => ({
        title: item.title,
        meta: `${vi ? 'Mã khóa' : 'Course'} #${item.courseId} · ${vi ? 'sở hữu trọn đời' : 'lifetime access'}${item.aiAssistEnabled ? (vi ? ' · trợ lý AI' : ' · AI assist') : ''}`,
        price: vnd(item.price),
      })),
      moreText: items.length > PAPER_ROWS
        ? `+ ${items.length - PAPER_ROWS} ${vi ? 'khóa khác trong giỏ' : 'more in the cart'}`
        : '',
      emptyText: vi ? 'Giỏ hàng đang trống' : 'Your cart is empty',
      lines,
      totalLabel: vi ? 'TỔNG THANH TOÁN' : 'TOTAL DUE',
      total: vnd(total),
      issued: `${vi ? 'LẬP NGÀY' : 'ISSUED'} ${issuedOn} · LEARNHUB · ${vi ? 'HÀ NỘI' : 'HANOI'}`,
      signer: 'LearnHub',
      signerRole: vi ? 'PHÒNG HỌC VỤ' : 'ACADEMIC OFFICE',
      sealMark: 'L',
      sealSub: 'EST · MMXXIV',
    }
  }, [paid, items, subtotal, discount, total, percent, coupon, gift, email, user, vi])

  const removeItem = async (courseId: number) => {
    await axiosClient.delete(`/api/commerce/cart/${courseId}`)
    load()
  }

  const checkout = async () => {
    setBusy(true)
    setMsg(null)
    try {
      const code = coupon.trim()
      const res = await axiosClient.post('/api/commerce/checkout', {
        couponCode: code && couponState.status === 'valid' ? code : null,
        gift,
        recipientEmail: gift ? email : null,
      })
      const order = res.data.data
      setPaid({
        id: Number(order?.id ?? 0),
        items: (order?.items || []).map((item: { title: string; price: number }) => ({
          title: item.title,
          price: Number(item.price) || 0,
        })),
        subtotal: Number(order?.subtotal ?? subtotal),
        discount: Number(order?.discount ?? 0),
        total: Number(order?.total ?? total),
        couponCode: order?.couponCode ?? null,
      })
    } catch (err) {
      setMsg(axios.isAxiosError(err)
        ? err.response?.data?.message || (vi ? 'Thanh toán thất bại' : 'Checkout failed')
        : (vi ? 'Thanh toán thất bại' : 'Checkout failed'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="page cart-page">
      <div className="cart-head">
        <p className="hero-kicker">
          {paid
            ? (vi ? 'Biên nhận 3D · LearnHub' : '3D receipt · LearnHub')
            : (vi ? 'Phiếu thanh toán 3D · LearnHub' : '3D order sheet · LearnHub')}
        </p>
        <h1>{paid ? t('paySuccessTitle') : t('cart')}</h1>
        <p className="muted">
          {paid
            ? t('paySuccessBody')
            : (vi
              ? 'Mọi khóa học được in trên tờ phiếu 3D. Thanh toán, mã giảm giá và giỏ hàng nằm trên tấm giấy cùng màu bên trong khung.'
              : 'Every course is printed on the 3D sheet. Checkout, coupon and the cart sit on a matching plaque inside the same frame.')}
        </p>
      </div>

      <div className="cart-shell">
        <CartPaper
          data={paper}
          hint={vi ? 'Đang in tờ phiếu 3D…' : 'Printing the 3D sheet…'}
        >
          <aside className={`cart-desk${paid ? ' is-paid' : ''}`}>
            {paid ? (
              <>
                <h2>{t('paySuccessTitle')}</h2>
                <ul className="cart-desk-list">
                  {paid.items.map((item) => (
                    <li key={item.title}>
                      <span className="grow">
                        <strong>{item.title}</strong>
                        <small>{vnd(item.price)}</small>
                      </span>
                      <span className="ok">✓</span>
                    </li>
                  ))}
                </ul>
                <dl className="cart-totals">
                  <div><dt>{t('subtotal')}</dt><dd>{vnd(paid.subtotal)}</dd></div>
                  {paid.discount > 0 && (
                    <div className="is-discount">
                      <dt>{t('coupon')}{paid.couponCode ? ` · ${paid.couponCode}` : ''}</dt>
                      <dd>− {vnd(paid.discount)}</dd>
                    </div>
                  )}
                  <div className="is-total"><dt>{vi ? 'Đã thanh toán' : 'Amount paid'}</dt><dd>{vnd(paid.total)}</dd></div>
                </dl>
                <button onClick={() => navigate('/learning')}>{t('viewPurchased')}</button>
                <button className="ghost" onClick={() => navigate('/')}>{t('backHome')}</button>
              </>
            ) : (
              <>
                <h2>{vi ? `Giỏ hàng · ${items.length} khóa` : `Cart · ${items.length} ${items.length === 1 ? 'course' : 'courses'}`}</h2>

                <ul className="cart-desk-list">
                  {items.length ? items.map((item) => (
                    <li key={item.id}>
                      <span className="grow">
                        <strong>{item.title}</strong>
                        <small>{vnd(item.price)}</small>
                      </span>
                      <button type="button" className="ghost" onClick={() => removeItem(item.courseId)}>
                        {vi ? 'Xóa' : 'Remove'}
                      </button>
                    </li>
                  )) : (
                    <li className="muted">{vi ? 'Chưa có khóa học nào trong giỏ.' : 'Nothing in the cart yet.'}</li>
                  )}
                </ul>

                <label className="cart-field">
                  <span>{t('coupon')}</span>
                  <input
                    value={coupon}
                    onChange={(e) => setCoupon(e.target.value)}
                    placeholder={vi ? 'VD: LEARNHUB20' : 'e.g. LEARNHUB20'}
                  />
                </label>
                {coupon.trim() && (
                  <p className={couponState.status === 'valid' ? 'ok' : couponState.status === 'invalid' ? 'err' : 'muted'}>
                    {couponState.status === 'checking' && (vi ? 'Đang kiểm tra mã…' : 'Checking code…')}
                    {couponState.status === 'valid' && (vi ? `Giảm ${couponState.percent}% — tiết kiệm ${vnd(discount)}` : `${couponState.percent}% off — you save ${vnd(discount)}`)}
                    {couponState.status === 'invalid' && couponState.message}
                    {couponState.status === 'idle' && (vi ? 'Thêm khóa học để áp mã.' : 'Add a course to apply the code.')}
                  </p>
                )}

                <label className="cart-check">
                  <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} />
                  <span>{t('gift')}</span>
                </label>
                {gift && (
                  <label className="cart-field">
                    <span>{vi ? 'Email người nhận' : 'Recipient email'}</span>
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ban@example.com" />
                  </label>
                )}

                <dl className="cart-totals">
                  <div><dt>{t('subtotal')}</dt><dd>{vnd(subtotal)}</dd></div>
                  {discount > 0 && (
                    <div className="is-discount">
                      <dt>{vi ? `Giảm giá ${percent}%` : `Discount ${percent}%`}</dt>
                      <dd>− {vnd(discount)}</dd>
                    </div>
                  )}
                  <div className="is-total"><dt>{vi ? 'Tổng thanh toán' : 'Total due'}</dt><dd>{vnd(total)}</dd></div>
                </dl>

                <button className="cart-pay" onClick={checkout} disabled={items.length === 0 || busy}>
                  {busy ? (vi ? 'Đang xử lý…' : 'Processing…') : `${t('checkout')} · ${vnd(total)}`}
                </button>
                {msg && <p className="err">{msg}</p>}
              </>
            )}
          </aside>
        </CartPaper>
      </div>
    </div>
  )
}
