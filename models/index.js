// Export all models for easy importing
const User = require('./User');
const BusinessProfile = require('./BusinessProfile');
const Application = require('./Application');
const Judge = require('./Judge');
const Admin = require('./Admin');
const ApplicationAssignment = require('./ApplicationAssignment');
const ApplicationLock = require('./ApplicationLock');
const Score = require('./Score');
const ApplicationTimeline = require('./ApplicationTimeline');
const Notification = require('./Notification');
const SystemSetting = require('./SystemSetting');

module.exports = {
  User,
  BusinessProfile,
  Application,
  Judge,
  Admin,
  ApplicationAssignment,
  ApplicationLock,
  Score,
  ApplicationTimeline,
  Notification,
  SystemSetting
};
