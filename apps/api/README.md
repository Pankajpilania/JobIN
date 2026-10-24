# JobIN API

This is the NestJS backend for the JobIN SaaS platform.

## Render Deployment Note

The API production start command runs `prisma migrate deploy` before starting the server. Keep `DATABASE_URL` configured on the Render service so pending schema migrations are applied before requests reach the application. This also covers Render services whose Start Command is configured directly in the dashboard.

IMPORTANT: After deploying to Render, sign up at [uptimerobot.com](https://uptimerobot.com) (free) and create an HTTP monitor for `https://[your-render-url].onrender.com/api/health` on a 5-minute interval. This prevents the free tier from spinning down and causing 30-second cold starts.

## Admin-managed AI providers

Set `AI_SETTINGS_ENCRYPTION_KEY` in the API environment before saving provider keys from Admin → AI settings. Generate a key with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"` and keep it stable; changing it makes previously encrypted provider keys unreadable. The key itself must never be committed or shared. Ollama must use a hosted endpoint reachable from the Render API service.
