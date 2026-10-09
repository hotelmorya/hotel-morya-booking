import { Toaster } from '@/components/ui/sonner'
import { Providers } from '@/components/providers'
import { ThemeProvider } from '@/components/theme-provider'

export default function HkLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <Providers>
        {children}
        <Toaster />
      </Providers>
    </ThemeProvider>
  )
}
