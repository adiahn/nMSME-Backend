# Rate Limiting Configuration Guide

**⚠️ RATE LIMITING IS CURRENTLY DISABLED**

This guide explains the rate limiting configuration for the nMSME Awards Backend system. Rate limiting has been completely disabled for maximum flexibility.

## 🎯 **Current Rate Limiting Settings**

### **All Rate Limiting DISABLED**
- **General API**: ❌ No limits
- **Authentication**: ❌ No limits  
- **Application Submissions**: ❌ No limits
- **Status**: Completely disabled for maximum flexibility

## 📊 **Rate Limiting Status**

| Endpoint Type | Previous | Current | Status |
|---------------|----------|---------|--------|
| General API | 1,000/15min | **UNLIMITED** | ✅ **DISABLED** |
| Authentication | 200/15min | **UNLIMITED** | ✅ **DISABLED** |
| Applications | 1,000/15min | **UNLIMITED** | ✅ **DISABLED** |

## 🔧 **How to Re-enable Rate Limiting (If Needed)**

### **Step 1: Uncomment Rate Limiting Code**

In `server.js`, uncomment these sections:

```javascript
// Uncomment this line:
const rateLimit = require('express-rate-limit');

// Uncomment the limiter configuration:
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
  // ... rest of configuration
});

// Uncomment the middleware applications:
app.use('/api/', limiter);
app.use('/api/applications', applicationLimiter);
app.use('/api/auth/', authLimiter);
```

### **Step 2: Environment Variables**

Your `config.env` already has the rate limiting variables:

```env
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=200
APPLICATION_RATE_LIMIT_MAX=1000
```

### **Customization Options**

#### **For High Traffic (Recommended)**
```env
RATE_LIMIT_MAX_REQUESTS=2000
AUTH_RATE_LIMIT_MAX=500
APPLICATION_RATE_LIMIT_MAX=2000
```

#### **For Very High Traffic**
```env
RATE_LIMIT_MAX_REQUESTS=5000
AUTH_RATE_LIMIT_MAX=1000
APPLICATION_RATE_LIMIT_MAX=5000
```

#### **For Development/Testing**
```env
RATE_LIMIT_MAX_REQUESTS=10000
AUTH_RATE_LIMIT_MAX=2000
APPLICATION_RATE_LIMIT_MAX=10000
```

## 🚨 **Important Notes**

### **What's Excluded from Rate Limiting**
- Health check endpoints (`/health`, `/api/health`)
- Application submission endpoints (already have their own limits)

### **Rate Limiting Headers**
The system includes standard rate limiting headers:
- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Time when the rate limit resets

### **Error Response**
When rate limit is exceeded:
```json
{
  "error": "Too many requests from this IP, please try again later."
}
```

## 📈 **Benefits of New Configuration**

1. **User-Friendly**: Much higher limits prevent legitimate users from being blocked
2. **Flexible**: Easy to adjust via environment variables
3. **Production-Ready**: Reasonable limits that protect against abuse
4. **Scalable**: Can be increased for high-traffic scenarios

## 🔄 **How to Apply Changes**

1. **Update Environment Variables**: Edit `config.env`
2. **Restart Server**: The changes take effect immediately
3. **Test**: Verify the new limits work as expected

## 🛠️ **Troubleshooting**

### **Still Getting Rate Limited?**
- Check if you're hitting the authentication limit (200/15min)
- Verify the correct environment variables are set
- Restart the server after making changes

### **Need Even Higher Limits?**
- Increase the values in `config.env`
- Consider implementing user-based rate limiting
- Add IP whitelisting for admin users

### **Monitoring Rate Limits**
- Check server logs for rate limit messages
- Monitor the rate limiting headers in responses
- Use analytics to understand traffic patterns

## 🎉 **Success Indicators**

- ✅ Users can register and login without being blocked
- ✅ Application submissions work smoothly
- ✅ No false positives from legitimate users
- ✅ System still protected against abuse
