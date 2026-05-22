import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

type PosDraftContextValue = {
  hasPendingCart: boolean
  setHasPendingCart: (value: boolean) => void
  clearPendingCart: () => void
}

const PosDraftContext = createContext<PosDraftContextValue | null>(null)

export function PosDraftProvider({ children }: { children: ReactNode }) {
  const [hasPendingCart, setHasPendingCart] = useState(false)

  const clearPendingCart = useCallback(() => {
    setHasPendingCart(false)
  }, [])

  const value = useMemo(
    () => ({
      hasPendingCart,
      setHasPendingCart,
      clearPendingCart,
    }),
    [clearPendingCart, hasPendingCart],
  )

  return <PosDraftContext.Provider value={value}>{children}</PosDraftContext.Provider>
}

export function usePosDraft() {
  const context = useContext(PosDraftContext)

  if (!context) {
    throw new Error('usePosDraft must be used inside PosDraftProvider')
  }

  return context
}
