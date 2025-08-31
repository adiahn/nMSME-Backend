const mongoose = require('mongoose');

const applicationLockSchema = new mongoose.Schema({
  application_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Application',
    required: true,
    unique: true
  },
  judge_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Judge',
    required: true
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  locked_at: {
    type: Date,
    required: true,
    default: Date.now
  },
  expires_at: {
    type: Date,
    required: true
  },
  is_active: {
    type: Boolean,
    default: true
  },
  lock_type: {
    type: String,
    enum: ['review', 'scoring', 'final_review'],
    default: 'review'
  },
  session_id: {
    type: String,
    required: true
  },
  last_activity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient querying
applicationLockSchema.index({ application_id: 1, is_active: 1 });
applicationLockSchema.index({ judge_id: 1, is_active: 1 });
applicationLockSchema.index({ expires_at: 1 });
applicationLockSchema.index({ session_id: 1 });

// Virtual for lock duration
applicationLockSchema.virtual('lock_duration_minutes').get(function() {
  return Math.floor((this.expires_at - this.locked_at) / (1000 * 60));
});

// Virtual for time remaining
applicationLockSchema.virtual('time_remaining_minutes').get(function() {
  if (!this.is_active) return 0;
  const remaining = this.expires_at - Date.now();
  return Math.max(0, Math.floor(remaining / (1000 * 60)));
});

// Method to check if lock is expired
applicationLockSchema.methods.isExpired = function() {
  return Date.now() > this.expires_at;
};

// Method to extend lock
applicationLockSchema.methods.extendLock = function(additionalMinutes = 30) {
  this.expires_at = new Date(Date.now() + (additionalMinutes * 60 * 1000));
  this.last_activity = new Date();
  return this.save();
};

// Method to release lock
applicationLockSchema.methods.releaseLock = function() {
  this.is_active = false;
  return this.save();
};

// Method to update activity
applicationLockSchema.methods.updateActivity = function() {
  this.last_activity = new Date();
  return this.save();
};

// Static method to acquire lock
applicationLockSchema.statics.acquireLock = async function(applicationId, judgeId, userId, lockType = 'review', sessionId, lockDurationMinutes = 60) {
  try {
    // Check if application is already locked
    const existingLock = await this.findOne({
      application_id: applicationId,
      is_active: true
    });

    if (existingLock) {
      // Check if lock is expired
      if (existingLock.isExpired()) {
        // Release expired lock
        await existingLock.releaseLock();
      } else {
        // Application is still locked by another judge
        return {
          success: false,
          error: 'Application is currently being reviewed by another judge',
          locked_by: existingLock.user_id,
          expires_at: existingLock.expires_at,
          time_remaining: existingLock.time_remaining_minutes
        };
      }
    }

    // Create new lock
    const lock = new this({
      application_id: applicationId,
      judge_id: judgeId,
      user_id: userId,
      lock_type: lockType,
      session_id: sessionId,
      expires_at: new Date(Date.now() + (lockDurationMinutes * 60 * 1000))
    });

    await lock.save();

    return {
      success: true,
      lock: lock,
      expires_at: lock.expires_at,
      time_remaining: lock.lock_duration_minutes
    };
  } catch (error) {
    console.error('Error acquiring lock:', error);
    return {
      success: false,
      error: 'Failed to acquire lock'
    };
  }
};

// Static method to release lock
applicationLockSchema.statics.releaseLock = async function(applicationId, judgeId) {
  try {
    const lock = await this.findOne({
      application_id: applicationId,
      judge_id: judgeId,
      is_active: true
    });

    if (lock) {
      await lock.releaseLock();
      return { success: true };
    }

    return { success: false, error: 'Lock not found' };
  } catch (error) {
    console.error('Error releasing lock:', error);
    return { success: false, error: 'Failed to release lock' };
  }
};

// Static method to check lock status
applicationLockSchema.statics.checkLockStatus = async function(applicationId) {
  try {
    const lock = await this.findOne({
      application_id: applicationId,
      is_active: true
    });

    if (!lock) {
      return { is_locked: false };
    }

    if (lock.isExpired()) {
      await lock.releaseLock();
      return { is_locked: false };
    }

    return {
      is_locked: true,
      locked_by: lock.user_id,
      judge_id: lock.judge_id,
      locked_at: lock.locked_at,
      expires_at: lock.expires_at,
      time_remaining: lock.time_remaining_minutes,
      lock_type: lock.lock_type
    };
  } catch (error) {
    console.error('Error checking lock status:', error);
    return { is_locked: false, error: 'Failed to check lock status' };
  }
};

// Static method to cleanup expired locks
applicationLockSchema.statics.cleanupExpiredLocks = async function() {
  try {
    const result = await this.updateMany(
      { expires_at: { $lt: new Date() }, is_active: true },
      { is_active: false }
    );
    
    if (result.modifiedCount > 0) {
      console.log(`🧹 Cleaned up ${result.modifiedCount} expired application locks`);
    }
    
    return result.modifiedCount;
  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
    return 0;
  }
};

// Static method to get active locks for a judge
applicationLockSchema.statics.getJudgeActiveLocks = async function(judgeId) {
  try {
    const locks = await this.find({
      judge_id: judgeId,
      is_active: true
    }).populate('application_id', 'category title status');

    return locks.filter(lock => !lock.isExpired());
  } catch (error) {
    console.error('Error getting judge active locks:', error);
    return [];
  }
};

module.exports = mongoose.model('ApplicationLock', applicationLockSchema);
