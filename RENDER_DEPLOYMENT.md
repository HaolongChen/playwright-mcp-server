# Deploying playwright-mcp-server to Render

This guide provides step-by-step instructions for deploying the playwright-mcp-server to Render using the simplified Dockerfile.

## Prerequisites

Before you begin, ensure you have:

1. A [Render account](https://render.com/) (free tier available)
2. A [GitHub account](https://github.com/)
3. Git installed on your local machine
4. Basic familiarity with command line operations

## Fork/Clone Instructions

### Option 1: Fork the Repository (Recommended)

1. Navigate to the [playwright-mcp-server repository](https://github.com/HaolongChen/playwright-mcp-server)
2. Click the **Fork** button in the top-right corner
3. Select your GitHub account as the destination
4. Clone your forked repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/playwright-mcp-server.git
   cd playwright-mcp-server
   ```

### Option 2: Clone Directly

```bash
git clone https://github.com/HaolongChen/playwright-mcp-server.git
cd playwright-mcp-server
```

## Render Service Setup Steps

### Step 1: Connect Your GitHub Account

1. Log in to your [Render Dashboard](https://dashboard.render.com/)
2. If this is your first time, connect your GitHub account:
   - Click on your profile icon
   - Select **Account Settings**
   - Under **Connected Accounts**, click **Connect** next to GitHub
   - Authorize Render to access your repositories

### Step 2: Create a New Web Service

1. From the Render Dashboard, click **New +** button
2. Select **Web Service**
3. Connect your repository:
   - If you forked: Find your `playwright-mcp-server` fork
   - If you have access: Grant Render permission to access the repository
4. Click **Connect** next to the repository

### Step 3: Configure the Service

Fill in the following configuration details:

| Field | Value |
|-------|-------|
| **Name** | `playwright-mcp-server` (or your preferred name) |
| **Region** | Choose the region closest to you |
| **Branch** | `main` (or your working branch) |
| **Root Directory** | Leave blank |
| **Runtime** | `Docker` |
| **Instance Type** | `Free` (or select paid tier for better performance) |

### Step 4: Advanced Settings

Scroll down to **Advanced** settings and configure:

1. **Dockerfile Path**: Should auto-detect `Dockerfile` in the root
2. **Docker Build Context Directory**: Leave as `.` (root directory)
3. **Auto-Deploy**: Toggle **Yes** (recommended) to automatically deploy on git push

## Environment Variables

Configure the following environment variables in Render:

### Required Variables

| Variable Name | Value | Description |
|---------------|-------|-------------|
| `PORT` | `10000` | Port that Render assigns (use 10000 as default) |
| `NODE_ENV` | `production` | Sets the Node.js environment |

### Optional Variables

| Variable Name | Example Value | Description |
|---------------|---------------|-------------|
| `MCP_SERVER_NAME` | `playwright-server` | Custom name for your MCP server |
| `LOG_LEVEL` | `info` | Logging level (debug, info, warn, error) |
| `TIMEOUT` | `30000` | Request timeout in milliseconds |

### How to Add Environment Variables

1. In your Render service settings, scroll to **Environment Variables**
2. Click **Add Environment Variable**
3. Enter the **Key** and **Value**
4. Click **Save Changes**

## Port Configuration

The playwright-mcp-server is configured to listen on the port specified by the `PORT` environment variable:

```javascript
const PORT = process.env.PORT || 3000;
```

**Important Notes:**

- Render automatically assigns port `10000` to your web service
- The `PORT` environment variable is automatically set by Render
- Your Dockerfile should expose the port with `EXPOSE 10000`
- Ensure your application binds to `0.0.0.0` (not `localhost`) to accept external connections

### Verifying Port Configuration

After deployment, check your service URL:
```
https://playwright-mcp-server-YOUR_ID.onrender.com
```

Test with curl:
```bash
curl https://playwright-mcp-server-YOUR_ID.onrender.com/health
```

## Common Troubleshooting Tips

### Issue: Service Won't Start

**Symptoms:** Service shows "Deploy failed" or keeps restarting

**Solutions:**
1. Check that your Dockerfile is valid:
   ```bash
   docker build -t test-build .
   ```
2. Verify Node.js version compatibility in Dockerfile
3. Ensure all dependencies are listed in `package.json`
4. Check that the start command is correct in your Dockerfile

### Issue: "Application Failed to Respond"

**Symptoms:** Render shows "Application failed to respond" error

**Solutions:**
1. Verify your app binds to `0.0.0.0`:
   ```javascript
   app.listen(PORT, '0.0.0.0', () => {
     console.log(`Server running on port ${PORT}`);
   });
   ```
2. Ensure `PORT` environment variable is used correctly
3. Check that your Dockerfile `EXPOSE` matches the port your app uses
4. Add a health check endpoint:
   ```javascript
   app.get('/health', (req, res) => {
     res.status(200).json({ status: 'healthy' });
   });
   ```

### Issue: Playwright Dependency Errors

**Symptoms:** Missing browser binaries or dependency errors

**Solutions:**
1. Use the official Playwright Docker image as base:
   ```dockerfile
   FROM mcr.microsoft.com/playwright:v1.40.0-jammy
   ```
2. Run `npx playwright install-deps` in Dockerfile
3. Ensure sufficient disk space (upgrade from free tier if needed)

### Issue: Memory Errors

**Symptoms:** "Out of memory" errors or service crashes

**Solutions:**
1. Upgrade to a paid instance type with more RAM
2. Optimize Playwright usage:
   - Close browsers after use
   - Limit concurrent browser instances
   - Use `headless: true` mode
3. Add memory limits to browser launch options:
   ```javascript
   await chromium.launch({
     headless: true,
     args: ['--disable-dev-shm-usage', '--no-sandbox']
   });
   ```

### Issue: Slow Cold Starts

**Symptoms:** First request takes a long time (free tier)

**Solutions:**
1. This is expected behavior on the free tier (spins down after inactivity)
2. Upgrade to a paid tier for always-on instances
3. Implement a health check ping service to keep it warm
4. Consider using Render's "Persistent Disk" for faster restarts

## How to View Logs and Debug Issues

### Accessing Logs via Dashboard

1. Go to your [Render Dashboard](https://dashboard.render.com/)
2. Click on your `playwright-mcp-server` service
3. Click on the **Logs** tab
4. View real-time logs of your application

### Log Filtering

Use the search box to filter logs:
- Search for `ERROR` to find errors
- Search for specific request IDs
- Filter by timestamp

### Enhanced Logging

Add structured logging to your application:

```javascript
// Example with Winston or similar logger
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Use in your code
logger.info('Server started', { port: PORT });
logger.error('Error occurred', { error: error.message, stack: error.stack });
```

### Debugging Common Issues

#### Enable Debug Mode

Set environment variable:
```
LOG_LEVEL=debug
```

#### Check Build Logs

1. In Render Dashboard, go to **Events** tab
2. Click on a deployment event
3. View the build logs to see if the Docker build succeeded

#### Shell Access (Paid Plans)

For paid plans, you can access a shell:

1. In your service dashboard, click **Shell**
2. Run diagnostic commands:
   ```bash
   # Check running processes
   ps aux
   
   # Check disk usage
   df -h
   
   # Check memory usage
   free -m
   
   # Test network connectivity
   curl http://localhost:10000/health
   ```

### Monitoring and Alerts

Set up monitoring:

1. In Render Dashboard, go to **Monitoring** tab
2. View metrics:
   - CPU usage
   - Memory usage
   - Request count
   - Response times
3. Set up alerts for critical metrics

### External Monitoring Tools

Consider integrating:
- **Sentry** for error tracking
- **LogDNA** or **Datadog** for log aggregation
- **Uptime Robot** for uptime monitoring
- **New Relic** for APM

## Post-Deployment Checklist

- [ ] Service is running and accessible via the Render URL
- [ ] Health check endpoint returns 200 OK
- [ ] Environment variables are properly configured
- [ ] Logs show no errors
- [ ] Test basic Playwright functionality
- [ ] Set up monitoring and alerts
- [ ] Configure custom domain (optional)
- [ ] Enable HTTPS (automatic with Render)
- [ ] Set up automatic deployments from GitHub

## Additional Resources

- [Render Documentation](https://render.com/docs)
- [Playwright Documentation](https://playwright.dev/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Production Best Practices](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)

## Support

If you encounter issues not covered in this guide:

1. Check [Render Community Forum](https://community.render.com/)
2. Review [Render Status Page](https://status.render.com/)
3. Contact [Render Support](https://render.com/support)
4. Open an issue in the [playwright-mcp-server repository](https://github.com/HaolongChen/playwright-mcp-server/issues)

---

**Last Updated:** December 12, 2025  
**Version:** 1.0.0