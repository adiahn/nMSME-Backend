const { ApplicationLock } = require('../models');
const crypto = require('crypto');

// Generate unique session ID for each request
const generateSessionId = () => {
  return crypto.randomBytes(16).toString('hex');
};

// Middleware to acquire application lock before allowing review
const acquireApplicationLock = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const judgeId = req.judgeProfile._id;
    const userId = req.user._id;
    const lockType = req.body.lock_type || 'review';
    const lockDuration = req.body.lock_duration || 60; // Default 60 minutes

    if (!applicationId) {
      return res.status(400).json({
        success: false,
        error: 'Application ID is required'
      });
    }

    // Generate session ID for this request
    const sessionId = generateSessionId();
    req.sessionId = sessionId;

    // Try to acquire lock
    const lockResult = await ApplicationLock.acquireLock(
      applicationId,
      judgeId,
      userId,
      lockType,
      sessionId,
      lockDuration
    );

    if (!lockResult.success) {
      return res.status(423).json({ // 423 Locked
        success: false,
        error: lockResult.error,
        lock_info: {
          locked_by: lockResult.locked_by,
          expires_at: lockResult.expires_at,
          time_remaining: lockResult.time_remaining
        }
      });
    }

    // Store lock information in request
    req.applicationLock = lockResult.lock;
    req.lockExpiresAt = lockResult.expires_at;
    req.lockTimeRemaining = lockResult.time_remaining;

    console.log(`🔒 Application ${applicationId} locked by judge ${judgeId} for ${lockDuration} minutes`);

    next();
  } catch (error) {
    console.error('Error acquiring application lock:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to acquire application lock'
    });
  }
};

// Middleware to release application lock
const releaseApplicationLock = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const judgeId = req.judgeProfile._id;

    if (req.applicationLock) {
      await ApplicationLock.releaseLock(applicationId, judgeId);
      console.log(`🔓 Application ${applicationId} lock released by judge ${judgeId}`);
    }

    next();
  } catch (error) {
    console.error('Error releasing application lock:', error);
    // Don't fail the request if lock release fails
    next();
  }
};

// Middleware to extend application lock
const extendApplicationLock = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const judgeId = req.judgeProfile._id;
    const additionalMinutes = req.body.extend_by || 30;

    if (req.applicationLock) {
      await req.applicationLock.extendLock(additionalMinutes);
      req.lockExpiresAt = req.applicationLock.expires_at;
      req.lockTimeRemaining = req.applicationLock.time_remaining;
      
      console.log(`⏰ Application ${applicationId} lock extended by ${additionalMinutes} minutes`);
    }

    next();
  } catch (error) {
    console.error('Error extending application lock:', error);
    next();
  }
};

// Middleware to check if application is locked by current judge
const checkApplicationLockOwnership = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const judgeId = req.judgeProfile._id;

    if (!req.applicationLock) {
      return res.status(400).json({
        success: false,
        error: 'No active lock found for this application'
      });
    }

    // Check if the lock belongs to the current judge
    if (req.applicationLock.judge_id.toString() !== judgeId.toString()) {
      return res.status(403).json({
        success: false,
        error: 'You do not have an active lock on this application'
      });
    }

    // Check if lock is expired
    if (req.applicationLock.isExpired()) {
      await req.applicationLock.releaseLock();
      return res.status(410).json({
        success: false,
        error: 'Application lock has expired. Please acquire a new lock.'
      });
    }

    // Update last activity
    await req.applicationLock.updateActivity();

    next();
  } catch (error) {
    console.error('Error checking application lock ownership:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to verify application lock'
    });
  }
};

// Middleware to check lock status without acquiring
const checkLockStatus = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    
    const lockStatus = await ApplicationLock.checkLockStatus(applicationId);
    req.lockStatus = lockStatus;
    
    next();
  } catch (error) {
    console.error('Error checking lock status:', error);
    req.lockStatus = { is_locked: false, error: 'Failed to check lock status' };
    next();
  }
};

// Middleware to cleanup expired locks (can be used in cron jobs)
const cleanupExpiredLocks = async (req, res, next) => {
  try {
    const cleanedCount = await ApplicationLock.cleanupExpiredLocks();
    req.cleanedLocksCount = cleanedCount;
    next();
  } catch (error) {
    console.error('Error cleaning up expired locks:', error);
    req.cleanedLocksCount = 0;
    next();
  }
};

// Middleware to get judge's active locks
const getJudgeActiveLocks = async (req, res, next) => {
  try {
    const judgeId = req.judgeProfile._id;
    const activeLocks = await ApplicationLock.getJudgeActiveLocks(judgeId);
    req.activeLocks = activeLocks;
    next();
  } catch (error) {
    console.error('Error getting judge active locks:', error);
    req.activeLocks = [];
    next();
  }
};

module.exports = {
  acquireApplicationLock,
  releaseApplicationLock,
  extendApplicationLock,
  checkApplicationLockOwnership,
  checkLockStatus,
  cleanupExpiredLocks,
  getJudgeActiveLocks
};
