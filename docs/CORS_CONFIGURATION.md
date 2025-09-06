# CORS Configuration

## Overview
This document outlines the Cross-Origin Resource Sharing (CORS) configuration for the nMSME Backend API.

## Allowed Origins

### Production Domains
- `https://kasedaaward.com` - Main production domain
- `https://www.kasedaaward.com` - www subdomain
- `https://admin.kasedaaward.com` - Admin panel subdomain
- `https://judge.kasedaaward.com` - Judge portal subdomain
- `https://n-msme-frontend.vercel.app` - Frontend application
- `https://nmsmeadmin.vercel.app` - Admin frontend

### Development Domains
- `http://localhost:3000` - Local development
- `http://127.0.0.1:3000` - Local development alternative

### Wildcard Patterns
- Any subdomain of `kasedaaward.com` is automatically allowed
- Any `localhost` or `127.0.0.1` origin is automatically allowed

## CORS Headers

### Allowed Methods
- `GET`
- `POST`
- `PUT`
- `DELETE`
- `PATCH`
- `OPTIONS`

### Allowed Headers
- `Origin`
- `X-Requested-With`
- `Content-Type`
- `Accept`
- `Authorization`
- `X-Auth-Token`
- `Access-Control-Allow-Origin`
- `Access-Control-Allow-Methods`
- `Access-Control-Allow-Headers`
- `Access-Control-Allow-Credentials`

### Exposed Headers
- `Content-Range`
- `X-Content-Range`

## Configuration Details

### Credentials
- `Access-Control-Allow-Credentials: true` - Allows cookies and authorization headers

### Preflight
- `maxAge: 86400` - Preflight cache for 24 hours
- `optionsSuccessStatus: 204` - Success status for OPTIONS requests

## Security Features

### Double CORS Protection
1. **Primary CORS middleware** - Uses `cors` package with origin validation
2. **Manual CORS headers** - Additional security layer with explicit origin checking

### Origin Validation Logic
```javascript
// Allow if origin is in explicit list OR matches wildcard patterns
if (allowedOrigins.indexOf(origin) !== -1 || 
    origin.includes('kasedaaward.com') ||
    origin.includes('localhost') ||
    origin.includes('127.0.0.1')) {
  // Allow request
}
```

## Testing

Run the CORS test script to verify configuration:
```bash
node scripts/test-cors-origins.js
```

## Recent Updates

### Added Subdomains (2025-09-05)
- `https://admin.kasedaaward.com` - Admin panel access
- `https://judge.kasedaaward.com` - Judge portal access
- `https://www.kasedaaward.com` - www subdomain support

## Troubleshooting

### Common Issues
1. **CORS Error**: Check if the origin is in the allowed list
2. **Credentials not sent**: Ensure `credentials: true` is set in frontend requests
3. **Preflight failure**: Verify OPTIONS requests are handled properly

### Debug Logs
The server logs all CORS checks with:
- Origin being checked
- List of allowed origins
- Allow/block decision

Example log:
```
CORS check - Origin: https://admin.kasedaaward.com
Allowed origins: [list of origins]
CORS allowed for origin: https://admin.kasedaaward.com
```
