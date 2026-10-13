import { useI18n } from '../context/I18nContext'
import { useTheme } from '../context/ThemeContext'

export default function ThemeSwitch() {
  const { theme, toggle } = useTheme()
  const { locale } = useI18n()
  const vi = locale === 'vi'
  const dark = theme === 'dark'
  return (
    <button type="button" className="theme-switch" onClick={toggle} aria-pressed={dark}>
      {dark ? (vi ? 'Sáng' : 'Light') : (vi ? 'Tối' : 'Dark')}
    </button>
  )
}
