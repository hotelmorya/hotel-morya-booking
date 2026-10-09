'use client'

import { ThemeProvider as NextThemesProvider } from 'next-themes'

// next-themes wrapper (class-based dark mode, design-system §11.3). Mounted at
// the root layout so login, admin, and the public site all get no-flash theming.
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
