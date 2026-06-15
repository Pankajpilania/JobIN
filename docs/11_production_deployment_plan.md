# Production Deployment Plan — JobIN

This document defines the deployment pipelines, containerization schemas, and operational monitoring configurations for the JobIN production environment.

---

## 1. Multi-Stage Docker Configurations

To minimize container size and eliminate security overhead, multi-stage builds are implemented.

### 1.1 Next.js Frontend Dockerfile
```dockerfile
# Stage 1: Build dependency graph
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# Stage 2: Build assets
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED 1
RUN npm run build

# Stage 3: Production runner
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
ENV PORT 3000
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 2. Kubernetes Deployment Configurations

Applications run inside AWS EKS pods isolated within Private Subnets behind AWS Load Balancers.

### 2.1 Sample Kubernetes Backend Deployment (`api-deployment.yaml`)
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jobin-api
  namespace: production
  labels:
    app: jobin-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jobin-api
  template:
    metadata:
      labels:
        app: jobin-api
    spec:
      containers:
      - name: api
        image: 123456789012.dkr.ecr.eu-west-2.amazonaws.com/jobin-api:latest
        imagePullPolicy: IfNotPresent
        ports:
        - containerPort: 4000
        envFrom:
        - configMapRef:
            name: api-config
        - secretRef:
            name: api-secrets
        resources:
          limits:
            cpu: "1"
            memory: 1024Mi
          requests:
            cpu: "250m"
            memory: 512Mi
        livenessProbe:
          httpGet:
            path: /health/liveness
            port: 4000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health/readiness
            port: 4000
          initialDelaySeconds: 15
          periodSeconds: 5
```

---

## 3. CI/CD GitHub Actions Pipeline (`.github/workflows/deploy.yml`)

The automation pipeline triggers on merges to the `main` branch.

```yaml
name: Production Deployment Pipeline

on:
  push:
    branches: [ main ]

jobs:
  validate-and-test:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: 20
        cache: 'npm'

    - name: Install Dependencies
      run: npm ci

    - name: Run Linters & Format Checks
      run: npm run lint

    - name: Run Unit & Integration Tests
      run: npm run test

  build-and-push:
    needs: validate-and-test
    runs-on: ubuntu-latest
    steps:
    - name: Checkout Code
      uses: actions/checkout@v4

    - name: Configure AWS Credentials
      uses: aws-actions/configure-aws-credentials@v4
      with:
        aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
        aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
        aws-region: eu-west-2

    - name: Log in to AWS ECR
      id: login-ecr
      uses: aws-actions/amazon-ecr-login@v2

    - name: Build and Push Docker Image
      run: |
        docker build -t ${{ steps.login-ecr.outputs.registry }}/jobin-api:latest -f Dockerfile.api .
        docker push ${{ steps.login-ecr.outputs.registry }}/jobin-api:latest

  gitops-sync:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
    - name: Trigger ArgoCD Webhook Sync
      run: |
        curl -X POST -H "Authorization: Bearer ${{ secrets.ARGOCD_TOKEN }}" \
        https://argocd.jobin.ai/api/v1/applications/jobin-production/sync
```

---

## 4. Monitoring & Alerting Thresholds

Infrastructure logs are analyzed by Prometheus and visual dashboards render in Grafana.

### 4.1 Critical Production Prometheus Rules

```yaml
groups:
- name: JobIN Infrastructure Alerts
  rules:
  # Pod Memory Alert
  - alert: KubernetesPodMemoryUsageHigh
    expr: sum(container_memory_working_set_bytes{container!=""}) by (pod) / sum(kube_pod_container_resource_limits{resource="memory"}) by (pod) * 100 > 85
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High memory utilization on Pod {{ $labels.pod }}"
      description: "Pod memory exceeds 85% limit configuration for 5 minutes continuously."

  # RDS Database Latency Alert
  - alert: PostgreSQLConnectionPoolSaturated
    expr: pg_stat_activity_count{state="active"} > 90
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Database connection saturation warning"
      description: "Active Postgres connection pool exceeds 90% of maximum allowed thresholds."

  # AI Endpoint Rate limit response checks
  - alert: APIHighRateLimitErrors
    expr: rate(nginx_ingress_controller_requests{status="429"}[5m]) > 5
    for: 1m
    labels:
      severity: critical
    annotations:
      summary: "Excessive API 429 Rate Limiting events detected"
