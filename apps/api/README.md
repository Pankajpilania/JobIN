# JobIN API

This is the NestJS backend for the JobIN SaaS platform.

## Render Deployment Note

IMPORTANT: After deploying to Render, sign up at [uptimerobot.com](https://uptimerobot.com) (free) and create an HTTP monitor for `https://[your-render-url].onrender.com/api/health` on a 5-minute interval. This prevents the free tier from spinning down and causing 30-second cold starts.
