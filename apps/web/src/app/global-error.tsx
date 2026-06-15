'use client'
import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html>
      <body>
        <div style={{
          display:'flex',flexDirection:'column',
          alignItems:'center',justifyContent:'center',
          minHeight:'100vh',fontFamily:'Inter,sans-serif',
          color:'#0F0E1A'
        }}>
          <h2 style={{fontSize:'24px',fontWeight:700,
            marginBottom:'12px'}}>
            Something went wrong
          </h2>
          <p style={{color:'#4B4B6A',marginBottom:'24px'}}>
            Our team has been notified. Please try again.
          </p>
          <button onClick={reset} style={{
            background:'#4F46E5',color:'white',
            border:'none',borderRadius:'8px',
            padding:'10px 24px',fontSize:'14px',
            fontWeight:600,cursor:'pointer'
          }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
