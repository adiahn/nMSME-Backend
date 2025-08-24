// Export all models for easy importing
const User = require('./User');
const BusinessProfile = require('./BusinessProfile');
const Application = require('./Application');
const Judge = require('./Judge');
const ApplicationAssignment = require('./ApplicationAssignment');
const Score = require('./Score');
const ApplicationTimeline = require('./ApplicationTimeline');
const Notification = require('./Notification');
const SystemSetting = require('./SystemSetting');

module.exports = {
  User,
  BusinessProfile,
  Application,
  Judge,
  ApplicationAssignment,
  Score,
  ApplicationTimeline,
  Notification,
  SystemSetting
};
