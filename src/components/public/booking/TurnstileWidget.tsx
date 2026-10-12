'use client'

import { useEffect, useRef } from 'react'

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement | string,
        options: {
          sitekey: string
          action?: string
          callback: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
          theme?: 'light' | 'dark' | 'auto'
          size?: 'normal' | 'compact' | 'flexible'
        },
      ) => string
      reset: (widgetId: string) => void
      remove: (widgetId: string) => void
    }
    onTurnstileLoad?: () => void
  }
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void
  onExpire?: () => void
  action?: string
  resetTrigger?: number
  className?: string
}

export function TurnstileWidget({
  onToken,
  onExpire,
  action = 'booking',
  resetTrigger = 0,
  className,
}: TurnstileWidgetProps) {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetIdRef = useRef<string | null>(null)
  const onTokenRef = useRef(onToken)
  const onExpireRef = useRef(onExpire)

  useEffect(() => {
    onTokenRef.current = onToken
    onExpireRef.current = onExpire
  })

  // Imperatively reset the Turnstile widget when parent signals a reset (e.g. failed attempt)
  useEffect(() => {
    if (resetTrigger > 0 && widgetIdRef.current && window.turnstile) {
      window.turnstile.reset(widgetIdRef.current)
    }
  }, [resetTrigger])

  useEffect(() => {
    if (!siteKey) {
      onTokenRef.current('dev-bypass')
      return
    }

    function renderWidget() {
      if (!containerRef.current || !window.turnstile) return
      if (widgetIdRef.current) return

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey!,
        action,
        callback: (token: string) => {
          onTokenRef.current(token)
        },
        'expired-callback': () => {
          onTokenRef.current('')
          if (onExpireRef.current) onExpireRef.current()
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        },
        'error-callback': () => {
          onTokenRef.current('')
          if (widgetIdRef.current && window.turnstile) {
            window.turnstile.reset(widgetIdRef.current)
          }
        },
        theme: 'light',
      })
    }

    if (window.turnstile) {
      renderWidget()
      return
    }

    window.onTurnstileLoad = renderWidget

    const SCRIPT_SRC =
      'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad'
    if (!document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const script = document.createElement('script')
      script.src = SCRIPT_SRC
      script.async = true
      script.defer = true
      document.head.appendChild(script)
    }

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current)
        widgetIdRef.current = null
      }
    }
  }, [siteKey, action])

  if (!siteKey) {
    return (
      <div
        aria-label="Turnstile verification not configured"
        className="h-[52px] rounded-xl border border-dashed border-border bg-muted/40 flex items-center justify-center text-xs text-muted-foreground"
      >
        Verified Human Protection (Dev Mode)
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={
        className ?? 'min-h-[65px] flex items-center justify-center sm:justify-start'
      }
    />
  )
}
