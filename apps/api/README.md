# JobIN API

This is the NestJS backend for the JobIN SaaS platform.

## Render Deployment Note

The Render start command runs `prisma migrate deploy` before starting the API. Keep `DATABASE_URL` configured on the Render service so pending schema migrations are applied before requests reach the application.

IMPORTANT: After deploying to Render, sign up at [uptimerobot.com](https://uptimerobot.com) (free) and create an HTTP monitor for `https://[your-render-url].onrender.com/api/health` on a 5-minute interval. This prevents the free tier from spinning down and causing 30-second cold starts.
