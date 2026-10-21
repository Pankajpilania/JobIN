export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const dsn = process.env.SENTRY_DSN
    if (dsn && !dsn.includes('your-sentry-dsn')) {
      const { init } = await import('@sentry/nextjs')
      init({
        dsn,
        tracesSampleRate: 1.0,
        environment: process.env.NODE_ENV,
      })
    }
  }
}
