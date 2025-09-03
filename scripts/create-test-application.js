const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Import models
const User = require('./models/User');
const Application = require('./models/Application');

async function createTestApplication() {
  try {
    console.log('🧪 CREATING TEST APPLICATION\n');
    console.log('=' .repeat(50));

    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB successfully\n');

    // First, create a test user
    console.log('👤 Creating test user...');
    const testUser = new User({
      first_name: 'Test',
      last_name: 'User',
      email: 'test@example.com',
      phone: '+2348012345678',
      password_hash: '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8QqHqKq', // password: test123
      role: 'applicant',
      is_verified: true,
      registration_step: 3
    });

    await testUser.save();
    console.log(`✅ Test user created: ${testUser._id}\n`);

    // Create a test application
    console.log('📝 Creating test application...');
    const testApplication = new Application({
      user_id: testUser._id,
      business_name: 'Test Business Solutions',
      cac_number: 'RC123456',
      sector: 'Information Technology (IT)',
      msme_strata: 'micro',
      location: {
        state: 'Lagos',
        lga: 'Victoria Island'
      },
      year_established: 2020,
      employee_count: 15,
      revenue_band: '₦100,000 - ₦500,000/month',
      business_description: 'A test business providing innovative IT solutions for SMEs.',
      website: 'https://testbusiness.com',
      social_media: {
        facebook: 'https://facebook.com/testbusiness',
        twitter: 'https://twitter.com/testbusiness',
        linkedin: 'https://linkedin.com/company/testbusiness',
        instagram: 'https://instagram.com/testbusiness'
      },
      category: 'Information Technology (IT)',
      workflow_stage: 'submitted', // Starts as submitted (no draft stage)
      key_achievements: 'Successfully served 50+ clients with innovative solutions.',
      products_services_description: 'Web development, mobile apps, and digital transformation services.',
      jobs_created: 15,
      women_youth_percentage: 40,
      export_activity: {
        has_exports: false,
        export_details: ''
      },
      sustainability_initiatives: {
        has_initiatives: true,
        initiative_details: 'Green hosting and energy-efficient practices.'
      },
      award_usage_plans: 'Expand operations and hire more developers.',
      pitch_video: {
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        platform: 'youtube'
      }
    });

    await testApplication.save();
    console.log(`✅ Test application created: ${testApplication._id}\n`);

    // Verify the application was created
    console.log('🔍 Verifying application creation...');
    const totalApplications = await Application.countDocuments();
    const totalUsers = await User.countDocuments();
    
    console.log(`📊 Total Applications: ${totalApplications}`);
    console.log(`📊 Total Users: ${totalUsers}`);
    
    if (totalApplications > 0) {
      console.log('\n🎉 SUCCESS! Test application created successfully.');
      console.log('The judge dashboard should now show 1 application.');
      console.log('\n💡 Next steps:');
      console.log('1. Restart your server (npm run dev)');
      console.log('2. Login as a judge');
      console.log('3. Check the judge dashboard');
      console.log('4. You should see the test application');
    }

  } catch (error) {
    console.error('❌ Error creating test application:', error.message);
    if (error.code === 11000) {
      console.error('Duplicate key error. The test user/application might already exist.');
    }
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the test
createTestApplication();
