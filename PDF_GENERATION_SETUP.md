# PDF Generation Setup for Vercel Deployment

## Overview
This document explains the PDF generation setup and troubleshooting for the RFP app backend deployed on Vercel.

## Problem
The original PDF generation was failing in Vercel's serverless environment due to missing system libraries (`libnss3.so`) required by Chromium.

## Solution Implemented

### 1. Multiple PDF Generation Methods
The system now tries three different approaches in sequence:

1. **puppeteer-extra with stealth plugin** - Most compatible with serverless environments
2. **Standard puppeteer** - Fallback option
3. **Chromium fallback** - Original method as last resort

### 2. Enhanced Vercel Configuration
Updated `vercel.json` with:
- Function timeout increased to 120 seconds
- Environment variables for Puppeteer
- Build environment configuration

### 3. Improved Error Handling
- Comprehensive logging for debugging
- Fallback mechanisms
- Environment detection
- Health check endpoint

## Files Modified

### vercel.json
- Added function configuration for PDF generation
- Increased timeout to 120 seconds
- Added environment variables

### utils/pdfGenerator.js
- Added multiple PDF generation methods
- Enhanced error handling and logging
- Added health check function
- Improved serverless environment detection

### routes/Proposals.js
- Added health check endpoint (`/api/proposals/health`)

## Dependencies Added
```bash
npm install puppeteer-extra puppeteer-extra-plugin-stealth
```

## Testing

### 1. Health Check
Test the PDF generation setup:
```bash
GET /api/proposals/health
```

### 2. PDF Generation
Test actual PDF generation:
```bash
POST /api/proposals/generatePDF
```

## Deployment Steps

1. **Commit and push changes**:
   ```bash
   git add .
   git commit -m "Fix PDF generation for Vercel deployment"
   git push
   ```

2. **Deploy to Vercel**:
   ```bash
   vercel --prod
   ```

3. **Test health endpoint**:
   ```bash
   curl https://your-app.vercel.app/api/proposals/health
   ```

## Troubleshooting

### Common Issues

1. **Function timeout**: Increase `maxDuration` in vercel.json
2. **Memory issues**: Check Vercel function logs for memory usage
3. **Library dependencies**: Ensure all required packages are installed

### Debugging

1. **Check Vercel function logs** for detailed error messages
2. **Use health check endpoint** to verify setup
3. **Monitor environment variables** in Vercel dashboard

### Environment Variables

Ensure these are set in Vercel:
- `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true`
- `PUPPETEER_EXECUTABLE_PATH=/tmp/chromium`
- `NODE_ENV=production`

## Performance Considerations

- **Function timeout**: Set to 120 seconds for complex PDFs
- **Memory usage**: Monitor function memory consumption
- **Cold starts**: Consider using Vercel's edge functions for better performance

## Alternative Solutions

If PDF generation continues to fail, consider:

1. **External PDF service** (e.g., Puppeteer-as-a-service)
2. **Server-side rendering** with different libraries
3. **Client-side PDF generation** using libraries like jsPDF

## Monitoring

- Use Vercel Analytics to monitor function performance
- Set up alerts for function failures
- Monitor function execution times and memory usage

## Support

For additional help:
1. Check Vercel function logs
2. Review this documentation
3. Test with health check endpoint
4. Check package.json for dependency versions
