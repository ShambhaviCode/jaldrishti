import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { STRINGS, type Lang, type Strings } from './strings.ts'

interface LangValue {
  lang: Lang
  t: Strings
  setLang: (l: Lang) => void
}

const LangContext = createContext<LangValue | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem('jd-lang')
    if (saved === 'hi' || saved === 'en') return saved
  } catch {
    /* storage can be blocked; default to Hindi */
  }
  return 'hi'
}

export function LangProvider({ children, initial }: { children: ReactNode; initial?: Lang }) {
  const [lang, setLangState] = useState<Lang>(initial ?? initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo<LangValue>(
    () => ({
      lang,
      t: STRINGS[lang],
      setLang: (l) => {
        setLangState(l)
        try {
          localStorage.setItem('jd-lang', l)
        } catch {
          /* ignore */
        }
      },
    }),
    [lang],
  )
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang(): LangValue {
  const v = useContext(LangContext)
  if (!v) throw new Error('useLang must be used inside LangProvider')
  return v
}
