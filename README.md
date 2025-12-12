# Playwright MCP Server

A Docker-based Model Context Protocol (MCP) server that provides Playwright browser automation capabilities. This server runs in a containerized environment with support for multiple browsers (Chromium, Firefox, WebKit) and can be deployed on various cloud platforms.

## Features

- 🎭 **Multi-browser Support**: Chromium, Firefox, and WebKit
- 🐳 **Docker-based**: Fully containerized with proper browser dependencies
- 🚀 **Cloud-ready**: Deploy to Fly.io, Railway, DigitalOcean, Render, and more
- 📊 **Health Monitoring**: Built-in health checks and logging
- 🔧 **MCP Protocol**: Standard Model Context Protocol implementation
- 🛡️ **Security**: Non-root container execution with security hardening

## Quick Start

### Local Development

1. **Clone the repository**
```bash
git clone https://github.com/HaolongChen/playwright-mcp-server.git
cd playwright-mcp-server
```

2. **Install dependencies**
```bash
npm install
```

3. **Run locally (requires Playwright browsers)**
```bash
npm start
```

### Docker Deployment

1. **Using Docker Compose (Recommended)**
```bash
docker-compose up -d
```

2. **Using Docker directly**
```bash
# Build the image
docker build -t playwright-mcp-server .

# Run the container
docker run -d -p 3000:3000 --name playwright-mcp playwright-mcp-server
```

3. **With nginx proxy**
```bash
docker-compose --profile proxy up -d
```

## API Endpoints

### Health Check
```bash
GET /health
```

### Available Tools
```bash
GET /tools
```

### MCP Protocol
```bash
POST /mcp
Content-Type: application/json

{
  "method": "navigate",
  "params": {
    "url": "https://example.com",
    "browser": "chromium"
  }
}
```

## Available MCP Tools

| Tool | Description | Parameters |
|------|-------------|------------|
| `navigate` | Navigate to a URL | `url`, `browser?`, `waitUntil?` |
| `screenshot` | Take a screenshot | `url`, `browser?`, `fullPage?`, `selector?` |
| `extractText` | Extract text content | `url`, `selector?`, `browser?` |
| `clickElement` | Click an element | `url`, `selector`, `browser?`, `waitForSelector?` |
| `fillForm` | Fill a form field | `url`, `selector`, `value`, `browser?` |
| `waitForElement` | Wait for element to appear | `url`, `selector`, `timeout?`, `browser?` |

### Example Tool Usage

```javascript
// Navigate to a page
{
  "method": "navigate",
  "params": {
    "url": "https://example.com",
    "browser": "chromium",
    "waitUntil": "networkidle"
  }
}

// Take a screenshot
{
  "method": "screenshot",
  "params": {
    "url": "https://example.com",
    "browser": "firefox",
    "fullPage": true
  }
}

// Extract text from a specific element
{
  "method": "extractText",
  "params": {
    "url": "https://example.com",
    "selector": ".main-content",
    "browser": "webkit"
  }
}
```

## Cloud Deployment

### Fly.io

1. **Install Fly CLI**
```bash
curl -L https://fly.io/install.sh | sh
```

2. **Create fly.toml**
```toml
app = "your-playwright-mcp-server"
primary_region = "ord"

[build]
  dockerfile = "Dockerfile"

[env]
  PORT = "8080"
  NODE_ENV = "production"

[[services]]
  http_checks = []
  internal_port = 8080
  processes = ["app"]
  protocol = "tcp"
  script_checks = []

  [services.concurrency]
    hard_limit = 10
    soft_limit = 5
    type = "connections"

  [[services.ports]]
    force_https = true
    handlers = ["http"]
    port = 80

  [[services.ports]]
    handlers = ["tls", "http"]
    port = 443

  [[services.tcp_checks]]
    grace_period = "10s"
    interval = "15s"
    restart_limit = 0
    timeout = "2s"

[vm]
  memory = "2gb"
  cpu_kind = "shared"
  cpus = 1
```

3. **Deploy**
```bash
fly launch
fly deploy
```

### Railway

1. **Connect Railway to your repository**
   - Go to [Railway.app](https://railway.app)
   - Import your GitHub repository

2. **Set environment variables**
```bash
PORT=3000
NODE_ENV=production
```

3. **Deploy automatically** - Railway will use your Dockerfile

### Render

Render provides a seamless deployment experience with automatic SSL, custom domains, and managed infrastructure. This guide covers deploying the Playwright MCP Server to Render using their Docker support.

#### Prerequisites

- A [Render account](https://render.com) (free tier available)
- Your GitHub repository connected to Render
- This project's Dockerfile in your repository

#### Step-by-Step Deployment

**1. Create a New Web Service**

- Log in to your [Render Dashboard](https://dashboard.render.com/)
- Click **"New +"** button in the top right
- Select **"Web Service"**

**2. Connect Your Repository**

- Choose **"Build and deploy from a Git repository"**
- Click **"Connect"** next to your GitHub account (authorize if needed)
- Select the `playwright-mcp-server` repository
- Click **"Connect"**

**3. Configure Your Web Service**

Fill in the following settings:

| Setting | Value | Description |
|---------|-------|-------------|
| **Name** | `playwright-mcp-server` | Your service name (will be part of URL) |
| **Region** | Choose closest to your users | e.g., Oregon (US West), Frankfurt (EU) |
| **Branch** | `main` | Git branch to deploy from |
| **Runtime** | `Docker` | Render will detect your Dockerfile |
| **Instance Type** | `Standard` or higher | Minimum recommended for Playwright |

**4. Environment Variables**

Under the **"Environment"** section, add the following variables:

| Key | Value | Required | Description |
|-----|-------|----------|-------------|
| `PORT` | `3000` | Yes | Application port (Render maps to public port automatically) |
| `NODE_ENV` | `production` | Yes | Node environment setting |

Click **"Add Environment Variable"** for each entry.

**5. Advanced Settings (Recommended)**

Expand **"Advanced"** section and configure:

**Docker Command Override** (optional):
```bash
npm start
```

**Health Check Path**:
```
/health
```

**Auto-Deploy**: ✅ Enabled (automatically deploy on git push)

**6. Resource Configuration**

Since Playwright requires significant resources, choose appropriate instance type:

| Instance Type | RAM | CPU | Use Case |
|---------------|-----|-----|----------|
| **Standard** | 2 GB | 1.0 | Light usage, single browser |
| **Standard Plus** | 4 GB | 2.0 | Multiple browsers, moderate load |
| **Pro** | 8 GB | 4.0 | High traffic, concurrent operations |

💡 **Recommendation**: Start with **Standard** ($7/month) and scale up if needed.

**7. Deploy Your Service**

- Review all settings
- Click **"Create Web Service"**
- Render will:
  1. Clone your repository
  2. Build the Docker image
  3. Deploy the container
  4. Assign a public URL

Your service will be available at: `https://playwright-mcp-server-XXXX.onrender.com`

#### Post-Deployment Configuration

**Custom Domain (Optional)**

1. Go to your service's **"Settings"** tab
2. Scroll to **"Custom Domain"** section
3. Click **"Add Custom Domain"**
4. Enter your domain (e.g., `playwright.yourdomain.com`)
5. Update your DNS records as instructed by Render

**Environment Groups (Optional)**

For managing multiple services with shared environment variables:

1. Go to **"Environment"** tab in your dashboard
2. Create an **Environment Group**
3. Add common variables (e.g., API keys)
4. Link the group to your services

**Monitoring and Logs**

- **Logs**: Click **"Logs"** tab to view real-time application logs
- **Metrics**: Click **"Metrics"** tab to monitor:
  - CPU usage
  - Memory consumption
  - HTTP requests
  - Response times
- **Events**: View deployment history and events

#### Testing Your Deployment

Once deployed, test your service:

**1. Health Check**
```bash
curl https://your-service-name.onrender.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "browsers": {
    "chromium": true,
    "firefox": true,
    "webkit": true
  }
}
```

**2. List Available Tools**
```bash
curl https://your-service-name.onrender.com/tools
```

**3. Test Navigation Tool**
```bash
curl -X POST https://your-service-name.onrender.com/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "method": "navigate",
    "params": {
      "url": "https://example.com",
      "browser": "chromium"
    }
  }'
```

#### Render-Specific Features

**Automatic HTTPS**
- All Render services get free SSL certificates
- HTTPS is enabled by default
- Certificates auto-renew

**Zero-Downtime Deploys**
- Render performs rolling deploys
- New version starts before old one stops
- No service interruption

**Persistent Disks (if needed)**
- Render services are ephemeral by default
- Add a persistent disk for permanent storage
- Not required for this Playwright server

**Pull Request Previews**
- Enable preview environments for PRs
- Test changes before merging
- Automatically created for each PR

#### Troubleshooting Render Deployment

**Build Failures**

If your build fails:
1. Check the build logs in the **"Logs"** tab
2. Ensure your Dockerfile is in the repository root
3. Verify all npm dependencies are listed in `package.json`

**Memory Issues**

If you see OOM (Out of Memory) errors:
1. Upgrade to a higher instance type
2. Consider using only Chromium browser (comment out others)
3. Monitor memory usage in the **"Metrics"** tab

**Service Won't Start**

If the service builds but won't start:
1. Verify the `PORT` environment variable is set to `3000`
2. Check that the application listens on `0.0.0.0`, not `localhost`
3. Review startup logs for error messages

**Health Check Failures**

If health checks fail:
1. Verify `/health` endpoint is responding
2. Check the health check path in settings
3. Ensure browsers initialize successfully (check logs)

**Slow Cold Starts**

Render may suspend free/starter services after inactivity:
- Upgrade to paid plan to keep service always-on
- First request after suspension may take 30-60 seconds
- Subsequent requests will be fast

#### Cost Optimization

**Free Tier Limitations**
- Free services spin down after 15 minutes of inactivity
- 750 hours/month of usage
- Shared resources
- ⚠️ Not recommended for production Playwright workloads

**Recommended Setup**
- **Development**: Standard instance ($7/month)
- **Production**: Standard Plus ($20/month) or higher
- Enable auto-scaling if needed

**Cost-Saving Tips**
1. Use single browser (Chromium) to reduce memory
2. Implement request queueing to handle concurrent load
3. Set up proper caching strategies
4. Monitor usage to right-size your instance

#### Updating Your Deployment

**Automatic Updates**
- Push to your connected branch
- Render automatically builds and deploys
- Watch deployment progress in dashboard

**Manual Deploy**
- Go to your service dashboard
- Click **"Manual Deploy"** button
- Select **"Clear build cache & deploy"** if needed

**Rollback**
- Click on **"Events"** tab
- Find previous successful deployment
- Click **"Rollback to this version"**

#### Additional Resources

- [Render Documentation](https://render.com/docs)
- [Render Docker Deployment Guide](https://render.com/docs/docker)
- [Render Environment Variables](https://render.com/docs/environment-variables)
- [Render Health Checks](https://render.com/docs/health-checks)

### DigitalOcean App Platform

1. **Create app.yaml**
```yaml
name: playwright-mcp-server
services:
- name: web
  source_dir: /
  github:
    repo: HaolongChen/playwright-mcp-server
    branch: main
  run_command: npm start
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  http_port: 3000
  env:
  - key: NODE_ENV
    value: production
```

2. **Deploy**
```bash
doctl apps create app.yaml
```

### Google Cloud Run

1. **Build and push to Container Registry**
```bash
gcloud builds submit --tag gcr.io/PROJECT-ID/playwright-mcp-server
```

2. **Deploy to Cloud Run**
```bash
gcloud run deploy --image gcr.io/PROJECT-ID/playwright-mcp-server --memory 2Gi --cpu 1
```

### AWS ECS/Fargate

1. **Push to ECR**
```bash
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.us-east-1.amazonaws.com
docker build -t playwright-mcp-server .
docker tag playwright-mcp-server:latest ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/playwright-mcp-server:latest
docker push ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/playwright-mcp-server:latest
```

2. **Create ECS Service** with task definition using your ECR image

## Local Docker Development

### Prerequisites
- Docker Engine 20.10+
- Docker Compose 2.0+
- 2GB+ available RAM

### Development Setup

1. **Clone and build**
```bash
git clone https://github.com/HaolongChen/playwright-mcp-server.git
cd playwright-mcp-server
docker-compose build
```

2. **Start services**
```bash
docker-compose up -d
```

3. **View logs**
```bash
docker-compose logs -f playwright-mcp
```

4. **Stop services**
```bash
docker-compose down
```

### Development with Hot Reload

```bash
# For development with nodemon
docker-compose -f docker-compose.dev.yml up
```

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment | `development` |

### Browser Configuration

The server initializes all three browsers on startup:
- **Chromium**: Fast, modern web standards
- **Firefox**: Good for cross-browser testing
- **WebKit**: Safari engine, iOS compatibility

## Monitoring & Logging

### Health Endpoint
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "browsers": {
    "chromium": true,
    "firefox": true,
    "webkit": true
  }
}
```

### Logs

- **Console logs**: Real-time server status
- **Error logs**: Saved to `error.log`
- **Structured logging**: JSON format with timestamps

## Security Considerations

1. **Non-root execution**: Container runs as `playwright` user
2. **Resource limits**: Memory and CPU constraints in docker-compose
3. **Network security**: Only port 3000 exposed
4. **Input validation**: All MCP parameters validated
5. **Browser isolation**: Each request uses isolated browser contexts

## Troubleshooting

### Common Issues

1. **Browser initialization fails**
   - Check available memory (minimum 2GB recommended)
   - Ensure Docker has sufficient resources

2. **Timeout errors**
   - Increase timeout values in MCP tool parameters
   - Check network connectivity

3. **Memory issues**
   - Monitor Docker memory usage
   - Consider scaling horizontally

### Debug Mode

```bash
# Enable debug logging
docker-compose up --build
```

### Container Shell Access

```bash
docker exec -it playwright-mcp-server_playwright-mcp_1 /bin/bash
```

## Performance Tuning

### Resource Requirements

| Deployment Size | CPU | Memory | Browsers |
|-----------------|-----|---------|----------|
| Small | 1 vCPU | 2GB RAM | Chromium only |
| Medium | 2 vCPU | 4GB RAM | All browsers |
| Large | 4 vCPU | 8GB RAM | All + concurrent |

### Optimization Tips

1. **Browser selection**: Use Chromium for best performance
2. **Context cleanup**: Automatic cleanup after each operation
3. **Resource monitoring**: Use health endpoints for monitoring
4. **Horizontal scaling**: Deploy multiple instances behind load balancer

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push branch: `git push origin feature/amazing-feature`
5. Create Pull Request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Support

- 📧 Issues: GitHub Issues
- 📖 Documentation: This README
- 🐳 Docker: Official Playwright Docker images
- 🎭 Playwright: [Playwright Documentation](https://playwright.dev)

---

**Built with ❤️ using Playwright and Docker**
