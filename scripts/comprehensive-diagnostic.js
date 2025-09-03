const axios = require('axios');

const LOCAL_URL = 'http://localhost:5000';
const JUDGE_EMAIL = 'adnan.mukhtar@nmsme-awards.org';
const JUDGE_PASSWORD = 'ad0701131nan';

async function comprehensiveDiagnostic() {
  try {
    console.log('🔍 COMPREHENSIVE APPLICATION DIAGNOSTIC\n');
    console.log('=' .repeat(80));

    // Step 1: Login as judge
    console.log('1️⃣ LOGGING IN AS JUDGE');
    console.log('-' .repeat(50));
    
    const loginResponse = await axios.post(`${LOCAL_URL}/api/auth/login`, {
      email_or_phone: JUDGE_EMAIL,
      password: JUDGE_PASSWORD
    });

    if (!loginResponse.data.success) {
      console.error('❌ Login failed:', loginResponse.data.error);
      return;
    }

    const token = loginResponse.data.token;
    const user = loginResponse.data.user;
    console.log('✅ Login successful');
    console.log(`📊 User: ${user.first_name} ${user.last_name} (${user.role})`);
    console.log(`📊 User ID: ${user._id}\n`);

    // Step 2: Check judge dashboard
    console.log('2️⃣ CHECKING JUDGE DASHBOARD');
    console.log('-' .repeat(50));
    
    try {
      const dashboardResponse = await axios.get(`${LOCAL_URL}/api/judge/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Dashboard accessible');
      const dashboard = dashboardResponse.data.data;
      console.log(`📊 Currently reviewing: ${dashboard.currently_reviewing}`);
      console.log(`📊 Completed reviews: ${dashboard.statistics.completed_reviews}`);
      console.log(`📊 Recent scores: ${dashboard.recent_scores.length}\n`);
      
    } catch (error) {
      console.error('❌ Dashboard error:', error.response?.data?.error || error.message);
    }

    // Step 3: Check available applications with detailed query analysis
    console.log('3️⃣ ANALYZING AVAILABLE APPLICATIONS QUERY');
    console.log('-' .repeat(50));
    
    try {
      // Test different query combinations
      const queries = [
        { name: 'All applications (no filters)', query: {} },
        { name: 'Submitted applications', query: { workflow_stage: 'submitted' } },
        { name: 'Under review applications', query: { workflow_stage: 'under_review' } },
        { name: 'Submitted applications', query: { workflow_stage: 'submitted' } },
        { name: 'Any workflow stage', query: { workflow_stage: { $exists: true } } },
        { name: 'Applications with any status', query: { status: { $exists: true } } }
      ];

      for (const queryTest of queries) {
        try {
          const response = await axios.get(`${LOCAL_URL}/api/judge/applications/available`, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: { limit: 1000, ...queryTest.query }
          });
          
          const apps = response.data.data.available_applications;
          const total = response.data.data.pagination.total_items;
          
          console.log(`📊 ${queryTest.name}: ${total} total, ${apps.length} returned`);
          
          if (apps.length > 0) {
            console.log(`   Sample: ${apps[0].title?.substring(0, 40) || 'No title'}...`);
            console.log(`   Workflow Stage: ${apps[0].workflow_stage}`);
            console.log(`   Status: ${apps[0].status || 'No status'}`);
          }
          console.log();
          
        } catch (error) {
          console.log(`📊 ${queryTest.name}: Error - ${error.response?.data?.error || error.message}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Available applications error:', error.response?.data?.error || error.message);
    }

    // Step 4: Check database directly through different endpoints
    console.log('4️⃣ DATABASE DIRECT QUERY ANALYSIS');
    console.log('-' .repeat(50));
    
    try {
      // Try to access admin endpoints to see all applications
      console.log('🔍 Trying admin dashboard for broader view...');
      const adminResponse = await axios.get(`${LOCAL_URL}/api/admin/dashboard`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Admin dashboard accessible:', adminResponse.status);
      const adminData = adminResponse.data.data;
      console.log(`📊 Total applications: ${adminData.total_applications || 'N/A'}`);
      console.log(`📊 Pending applications: ${adminData.pending_applications || 'N/A'}`);
      console.log(`📊 Under review: ${adminData.applications_under_review || 'N/A'}`);
      console.log(`📊 Completed reviews: ${adminData.completed_reviews || 'N/A'}\n`);
      
    } catch (error) {
      console.log('ℹ️ Admin endpoint not accessible (expected for judge)');
    }

    // Step 5: Check public endpoints
    console.log('5️⃣ CHECKING PUBLIC ENDPOINTS');
    console.log('-' .repeat(50));
    
    try {
      console.log('🔍 Trying public applications endpoint...');
      const publicResponse = await axios.get(`${LOCAL_URL}/api/public/applications`);
      
      console.log('✅ Public applications accessible:', publicResponse.status);
      const publicData = publicResponse.data.data;
      console.log(`📊 Public applications: ${publicData.applications?.length || 0}`);
      
      if (publicData.applications && publicData.applications.length > 0) {
        console.log(`   Sample: ${publicData.applications[0].business_name || 'No name'}...`);
        console.log(`   Category: ${publicData.applications[0].category || 'No category'}`);
        console.log(`   Status: ${publicData.applications[0].status || 'No status'}`);
      }
      console.log();
      
    } catch (error) {
      console.log('ℹ️ Public applications endpoint not accessible');
    }

    // Step 6: Check categories and sectors
    console.log('6️⃣ CHECKING CATEGORIES AND SECTORS');
    console.log('-' .repeat(50));
    
    try {
      const categoriesResponse = await axios.get(`${LOCAL_URL}/api/categories`);
      
      console.log('✅ Categories accessible:', categoriesResponse.status);
      const categories = categoriesResponse.data.data;
      console.log(`📊 Total categories: ${categories.length}`);
      
      if (categories.length > 0) {
        console.log('📋 Available categories:');
        categories.forEach((cat, index) => {
          console.log(`   ${index + 1}. ${cat.name} (${cat.sector})`);
        });
      }
      console.log();
      
    } catch (error) {
      console.log('ℹ️ Categories endpoint not accessible');
    }

    // Step 7: Check application creation endpoint
    console.log('7️⃣ TESTING APPLICATION CREATION ENDPOINT');
    console.log('-' .repeat(50));
    
    try {
      // Test if we can access the applications endpoint
      const testResponse = await axios.get(`${LOCAL_URL}/api/applications`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Applications endpoint accessible:', testResponse.status);
      const testData = testResponse.data.data;
      console.log(`📊 User applications: ${testData.applications?.length || 0}`);
      
      if (testData.applications && testData.applications.length > 0) {
        console.log(`   Sample: ${testData.applications[0].business_name || 'No name'}...`);
        console.log(`   Workflow Stage: ${testData.applications[0].workflow_stage || 'No stage'}`);
        console.log(`   Status: ${testData.applications[0].status || 'No status'}`);
      }
      console.log();
      
    } catch (error) {
      console.log('ℹ️ Applications endpoint not accessible');
    }

    // Step 8: Check for any applications in different collections
    console.log('8️⃣ CHECKING ALTERNATIVE DATA SOURCES');
    console.log('-' .repeat(50));
    
    try {
      // Check if there are any business profiles
      console.log('🔍 Checking business profiles...');
      const businessResponse = await axios.get(`${LOCAL_URL}/api/user/business-profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      console.log('✅ Business profile accessible:', businessResponse.status);
      const businessData = businessResponse.data.data;
      console.log(`📊 Business profile data:`, JSON.stringify(businessData, null, 2));
      
    } catch (error) {
      console.log('ℹ️ Business profile endpoint not accessible');
    }

    // Step 9: Check server health and database connection
    console.log('9️⃣ SERVER HEALTH AND DATABASE CHECK');
    console.log('-' .repeat(50));
    
    try {
      const healthResponse = await axios.get(`${LOCAL_URL}/health`);
      console.log('✅ Server health:', healthResponse.status);
      console.log('📊 Health data:', JSON.stringify(healthResponse.data, null, 2));
      
    } catch (error) {
      console.log('❌ Health endpoint not accessible');
    }

    console.log('=' .repeat(80));
    console.log('🎯 COMPREHENSIVE DIAGNOSTIC COMPLETED');
    console.log('=' .repeat(80));
    
    console.log('\n💡 ANALYSIS SUMMARY:');
    console.log('1. Check if applications exist in different workflow stages');
    console.log('2. Verify database connection and collections');
    console.log('3. Check if applications are in different collections');
    console.log('4. Verify judge query filters');
    console.log('5. Check for data migration issues');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

comprehensiveDiagnostic();
