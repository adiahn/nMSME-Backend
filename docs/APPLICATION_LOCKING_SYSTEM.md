# 🔒 **APPLICATION LOCKING SYSTEM**

## 📋 **Overview**

The Application Locking System prevents multiple judges from reviewing the same application simultaneously, ensuring data integrity and preventing conflicts during the evaluation process.

## 🎯 **Key Features**

### **1. Exclusive Access Control**
- Only one judge can review an application at a time
- Automatic lock expiration to prevent indefinite holds
- Session-based locking with unique identifiers

### **2. Lock Management**
- Configurable lock duration (default: 60 minutes)
- Lock extension capability
- Automatic cleanup of expired locks
- Activity tracking and monitoring

### **3. Security & Validation**
- Judge ownership verification
- Assignment status validation
- Session ID generation for each lock request

## 🏗️ **System Architecture**

### **Models**
- **ApplicationLock**: Manages lock state and metadata
- **ApplicationAssignment**: Tracks assignment status changes
- **Judge**: Links to user accounts and profiles

### **Middleware**
- **acquireApplicationLock**: Secures exclusive access
- **releaseApplicationLock**: Frees applications for other judges
- **extendApplicationLock**: Increases lock duration
- **checkApplicationLockOwnership**: Validates lock ownership

## 🔑 **API Endpoints**

### **Lock Management**

#### **1. Acquire Lock**
```http
POST /api/judge/applications/:applicationId/lock
Authorization: Bearer <JUDGE_JWT_TOKEN>
Content-Type: application/json

{
  "lock_type": "review",
  "lock_duration": 60
}
```

**Response (Success - 200)**:
```json
{
  "success": true,
  "message": "Application locked successfully for review",
  "data": {
    "lock": {
      "id": "lock_id",
      "expires_at": "2024-01-15T10:30:00.000Z",
      "time_remaining": 60,
      "lock_type": "review"
    },
    "assignment": {
      "id": "assignment_id",
      "status": "in_review",
      "locked_at": "2024-01-15T09:30:00.000Z"
    }
  }
}
```

**Response (Already Locked - 423)**:
```json
{
  "success": false,
  "error": "Application is currently being reviewed by another judge",
  "lock_info": {
    "locked_by": "judge_user_id",
    "expires_at": "2024-01-15T10:30:00.000Z",
    "time_remaining": 45
  }
}
```

#### **2. Extend Lock**
```http
PUT /api/judge/applications/:applicationId/lock/extend
Authorization: Bearer <JUDGE_JWT_TOKEN>
Content-Type: application/json

{
  "extend_by": 30
}
```

**Response**:
```json
{
  "success": true,
  "message": "Application lock extended by 30 minutes",
  "data": {
    "lock": {
      "id": "lock_id",
      "expires_at": "2024-01-15T11:00:00.000Z",
      "time_remaining": 90,
      "lock_type": "review"
    }
  }
}
```

#### **3. Release Lock**
```http
DELETE /api/judge/applications/:applicationId/lock
Authorization: Bearer <JUDGE_JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "message": "Application lock released successfully"
}
```

#### **4. Check Lock Status**
```http
GET /api/judge/applications/:applicationId/lock/status
Authorization: Bearer <JUDGE_JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lock_status": {
      "is_locked": true,
      "locked_by": "judge_user_id",
      "judge_id": "judge_profile_id",
      "locked_at": "2024-01-15T09:30:00.000Z",
      "expires_at": "2024-01-15T10:30:00.000Z",
      "time_remaining": 45,
      "lock_type": "review"
    },
    "judge_has_lock": true
  }
}
```

#### **5. Get Active Locks**
```http
GET /api/judge/locks/active
Authorization: Bearer <JUDGE_JWT_TOKEN>
```

**Response**:
```json
{
  "success": true,
  "data": {
    "active_locks": [
      {
        "id": "lock_id",
        "application_id": "application_id",
        "application_category": "fashion",
        "application_title": "Fashion Business",
        "lock_type": "review",
        "locked_at": "2024-01-15T09:30:00.000Z",
        "expires_at": "2024-01-15T10:30:00.000Z",
        "time_remaining": 45,
        "last_activity": "2024-01-15T09:45:00.000Z"
      }
    ]
  }
}
```

## 🔄 **Workflow Example**

### **Scenario: Two Judges Trying to Review Same Application**

1. **Judge A** acquires lock on Application X
   - Lock duration: 60 minutes
   - Assignment status: `in_review`
   - Lock expires: 10:30 AM

2. **Judge B** attempts to acquire lock on Application X
   - **Result**: HTTP 423 (Locked)
   - **Error**: "Application is currently being reviewed by another judge"
   - **Info**: Lock expires in 45 minutes

3. **Judge A** extends lock by 30 minutes
   - New expiration: 11:00 AM
   - Total lock duration: 90 minutes

4. **Judge A** completes review and releases lock
   - Assignment status: `assigned`
   - Application available for other judges

5. **Judge B** can now acquire lock on Application X
   - **Result**: HTTP 200 (Success)
   - New lock duration: 60 minutes

## 🚨 **Error Handling**

### **HTTP Status Codes**
- **200**: Success
- **400**: Bad Request (missing parameters)
- **401**: Unauthorized (invalid token)
- **403**: Forbidden (not assigned to judge)
- **404**: Not Found (application/assignment not found)
- **410**: Gone (lock expired)
- **423**: Locked (application already locked by another judge)
- **500**: Internal Server Error

### **Common Error Messages**
- `"Application is not assigned to you or not available for review"`
- `"Application is currently being reviewed by another judge"`
- `"No active lock found for this application"`
- `"Application lock has expired. Please acquire a new lock."`
- `"You do not have an active lock on this application"`

## ⚙️ **Configuration**

### **Environment Variables**
```bash
# Lock duration in minutes (default: 60)
DEFAULT_LOCK_DURATION=60

# Lock extension increment in minutes (default: 30)
DEFAULT_LOCK_EXTENSION=30

# Cleanup interval for expired locks in minutes (default: 15)
LOCK_CLEANUP_INTERVAL=15
```

### **Lock Types**
- **`review`**: Initial application review
- **`scoring`**: Detailed scoring process
- **`final_review`**: Final evaluation round

## 🧹 **Maintenance & Cleanup**

### **Automatic Cleanup**
```javascript
// Cleanup expired locks (can be run via cron job)
const { ApplicationLock } = require('../models');
const cleanedCount = await ApplicationLock.cleanupExpiredLocks();
console.log(`Cleaned up ${cleanedCount} expired locks`);
```

### **Manual Cleanup**
```javascript
// Force release all locks for a judge
const { ApplicationLock } = require('../models');
await ApplicationLock.updateMany(
  { judge_id: judgeId, is_active: true },
  { is_active: false }
);
```

## 🔍 **Monitoring & Analytics**

### **Lock Statistics**
- Total active locks
- Lock duration distribution
- Lock extension frequency
- Expired lock cleanup count

### **Judge Activity**
- Applications currently locked by each judge
- Average lock duration per judge
- Lock extension patterns
- Review completion rates

## 🧪 **Testing**

### **Test Script**
Run the comprehensive test:
```bash
node test-application-locking.js
```

### **Manual Testing**
1. Login as Judge A
2. Acquire lock on an application
3. Login as Judge B (different browser/session)
4. Attempt to acquire lock on same application
5. Verify Judge B receives 423 status
6. Release lock as Judge A
7. Verify Judge B can now acquire lock

## 🚀 **Integration with Frontend**

### **Real-time Updates**
- WebSocket notifications for lock status changes
- Live countdown timers for lock expiration
- Automatic lock extension prompts
- Lock status indicators in UI

### **User Experience**
- Clear visual indicators for locked applications
- Lock expiration warnings
- Easy lock extension interface
- Lock release confirmation dialogs

## 🔐 **Security Considerations**

### **Session Management**
- Unique session ID for each lock request
- Token validation on every lock operation
- Judge ownership verification
- Assignment status validation

### **Data Integrity**
- Atomic lock operations
- Transaction-based lock management
- Automatic cleanup of orphaned locks
- Audit trail for all lock operations

## 📊 **Performance Optimization**

### **Database Indexes**
```javascript
// Optimized queries for lock operations
applicationLockSchema.index({ application_id: 1, is_active: 1 });
applicationLockSchema.index({ judge_id: 1, is_active: 1 });
applicationLockSchema.index({ expires_at: 1 });
applicationLockSchema.index({ session_id: 1 });
```

### **Caching Strategy**
- Redis cache for frequently accessed lock status
- In-memory lock registry for active sessions
- Periodic cache invalidation
- Lock status aggregation queries

---

## 🎉 **Benefits**

✅ **Prevents Data Conflicts**: No two judges can modify the same application simultaneously
✅ **Ensures Data Integrity**: Consistent application state during review process
✅ **Improves Efficiency**: Clear ownership and responsibility for each application
✅ **Provides Transparency**: Real-time visibility into application review status
✅ **Enables Scalability**: Supports multiple judges without coordination issues
✅ **Maintains Audit Trail**: Complete history of lock operations and timing

---

**The Application Locking System ensures a smooth, conflict-free review process for all judges in the nMSME Awards Portal!** 🔒✨
