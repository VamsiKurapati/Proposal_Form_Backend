# PDF Generation Setup Guide

## Overview
This application uses Puppeteer for PDF generation, with different configurations for local development and serverless deployment (Vercel).

## Dependencies
- `puppeteer`: For local development (includes Chrome)
- `puppeteer-core`: For serverless deployment (Chrome not included)
- `@sparticuz/chromium`: Serverless-compatible Chrome binary

## Local Development
For local development, the application automatically uses regular Puppeteer which includes Chrome.

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation
```bash
npm install
```

## Serverless Deployment (Vercel)

### Configuration
The `vercel.json` file is configured with:
- Build configuration for Node.js
- Environment variable: `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- Region: `iad1` (US East - N. Virginia)

**Note**: Function timeout and memory settings are now configured through the Vercel dashboard or CLI, not in `vercel.json`.

### Environment Variables
Set these in your Vercel dashboard:
```
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
NODE_ENV=production
```

### Function Configuration
For PDF generation functions, configure these settings in your Vercel dashboard:
- **Timeout**: 60 seconds (recommended)
- **Memory**: 1024 MB (recommended)

### Deployment
```bash
vercel --prod
```

## How It Works

### Environment Detection
The application automatically detects the environment:
- **Local**: Uses `puppeteer` with system Chrome
- **Serverless**: Uses `puppeteer-core` with `@sparticuz/chromium`

### Browser Launch Options
```javascript
// Local development
{
    headless: true,
    args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
    ]
}

// Serverless deployment
{
    args: chromium.args,
    defaultViewport: chromium.defaultViewport,
    executablePath: await chromium.executablePath(),
    headless: chromium.headless,
    ignoreHTTPSErrors: true,
}
```

## Troubleshooting

### Common Issues

1. **Chrome not found locally**
   - Ensure Puppeteer is installed: `npm install puppeteer`
   - Chrome will be downloaded automatically

2. **Serverless deployment fails**
   - Check Vercel function logs
   - Ensure `@sparticuz/chromium` is installed
   - Verify function timeout is sufficient (60s)
   - Check function memory allocation (1024 MB recommended)

3. **Memory issues**
   - Increase Vercel function memory allocation if needed
   - Consider optimizing HTML content size

### Performance Optimization

1. **Image processing**: Images are converted to base64 for embedding
2. **Browser cleanup**: Browser instances are always closed after use
3. **Timeout handling**: 60-second timeout for PDF generation
4. **Error handling**: Comprehensive error logging and response handling

## Security Considerations

- Browser runs in headless mode
- Sandbox disabled for serverless compatibility
- Web security disabled for PDF generation
- No file system access beyond temporary files

## Monitoring

Monitor your Vercel function logs for:
- PDF generation success/failure rates
- Execution time
- Memory usage
- Error patterns

## Support

For issues related to:
- **Puppeteer**: Check [Puppeteer troubleshooting](https://pptr.dev/troubleshooting)
- **Chrome AWS Lambda**: Check [@sparticuz/chromium](https://github.com/Sparticuz/chromium)
- **Vercel**: Check [Vercel documentation](https://vercel.com/docs)
