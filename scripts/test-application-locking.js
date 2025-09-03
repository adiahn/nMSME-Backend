const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Test data
const testData = {
  judge1: {
    email: "adnan.mukhtar@nmsme-awards.org",
    password: "ad0701131nan"
  },
  judge2: {
    email: "testjudge@nmsme-awards.org",
    password: "TestJudge2024!"
  }
};

let judge1Token = null;
let judge2Token = null;
let testApplicationId = null;

async function testApplicationLocking() {
  try {
    console.log('🔒 Testing Application Locking System...\n');

    // Step 1: Login both judges
    console.log('1️⃣ Logging in both judges...');
    
    // Login Judge 1
    const judge1Login = await axios.post(`${API_BASE_URL}/auth/login`, testData.judge1);
    judge1Token = judge1Login.data.token;
    console.log('✅ Judge 1 logged in:', judge1Login.data.user.first_name);

    // Login Judge 2
    const judge2Login = await axios.post(`${API_BASE_URL}/auth/login`, testData.judge2);
    judge2Token = judge2Login.data.token;
    console.log('✅ Judge 2 logged in:', judge2Login.data.user.first_name);

    // Step 2: Get assigned applications for Judge 1
    console.log('\n2️⃣ Getting assigned applications for Judge 1...');
    const assignments1 = await axios.get(`${API_BASE_URL}/judge/assignments`, {
      headers: { 'Authorization': `Bearer ${judge1Token}` }
    });

    if (assignments1.data.data.assignments.length === 0) {
      console.log('❌ No applications assigned to Judge 1. Please assign some applications first.');
      return;
    }

    testApplicationId = assignments1.data.data.assignments[0].application_id._id;
    console.log('✅ Found test application:', testApplicationId);

    // Step 3: Test lock acquisition by Judge 1
    console.log('\n3️⃣ Testing lock acquisition by Judge 1...');
    const lock1 = await axios.post(`${API_BASE_URL}/judge/applications/${testApplicationId}/lock`, {
      lock_type: 'review',
      lock_duration: 60
    }, {
      headers: { 'Authorization': `Bearer ${judge1Token}` }
    });

    if (lock1.data.success) {
      console.log('✅ Judge 1 acquired lock successfully');
      console.log('   Lock expires at:', lock1.data.data.lock.expires_at);
      console.log('   Time remaining:', lock1.data.data.lock.time_remaining, 'minutes');
    } else {
      console.log('❌ Judge 1 failed to acquire lock:', lock1.data.error);
    }

    // Step 4: Test lock acquisition by Judge 2 (should fail)
    console.log('\n4️⃣ Testing lock acquisition by Judge 2 (should fail)...');
    try {
      const lock2 = await axios.post(`${API_BASE_URL}/judge/applications/${testApplicationId}/lock`, {
        lock_type: 'review',
        lock_duration: 60
      }, {
        headers: { 'Authorization': `Bearer ${judge2Token}` }
      });
      
      if (lock2.data.success) {
        console.log('❌ Judge 2 should not have been able to acquire lock!');
      }
    } catch (error) {
      if (error.response && error.response.status === 423) {
        console.log('✅ Judge 2 correctly blocked from acquiring lock');
        console.log('   Error:', error.response.data.error);
        console.log('   Locked by:', error.response.data.lock_info.locked_by);
        console.log('   Time remaining:', error.response.data.lock_info.time_remaining, 'minutes');
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }

    // Step 5: Check lock status
    console.log('\n5️⃣ Checking lock status...');
    const lockStatus = await axios.get(`${API_BASE_URL}/judge/applications/${testApplicationId}/lock/status`, {
      headers: { 'Authorization': `Bearer ${judge1Token}` }
    });

    if (lockStatus.data.success) {
      console.log('✅ Lock status retrieved');
      console.log('   Is locked:', lockStatus.data.data.lock_status.is_locked);
      console.log('   Judge has lock:', lockStatus.data.data.judge_has_lock);
      if (lockStatus.data.data.lock_status.is_locked) {
        console.log('   Locked by:', lockStatus.data.data.lock_status.locked_by);
        console.log('   Time remaining:', lockStatus.data.data.lock_status.time_remaining, 'minutes');
      }
    }

    // Step 6: Test lock extension by Judge 1
    console.log('\n6️⃣ Testing lock extension by Judge 1...');
    const extendLock = await axios.put(`${API_BASE_URL}/judge/applications/${testApplicationId}/lock/extend`, {
      extend_by: 30
    }, {
      headers: { 'Authorization': `Bearer ${judge1Token}` }
    });

    if (extendLock.data.success) {
      console.log('✅ Lock extended successfully');
      console.log('   New time remaining:', extendLock.data.data.lock.time_remaining, 'minutes');
    } else {
      console.log('❌ Lock extension failed:', extendLock.data.error);
    }

    // Step 7: Get active locks for Judge 1
    console.log('\n7️⃣ Getting active locks for Judge 1...');
    const activeLocks = await axios.get(`${API_BASE_URL}/judge/locks/active`, {
      headers: { 'Authorization': `Bearer ${judge1Token}` }
    });

    if (activeLocks.data.success) {
      console.log('✅ Active locks retrieved');
      console.log('   Number of active locks:', activeLocks.data.data.active_locks.length);
      activeLocks.data.data.active_locks.forEach((lock, index) => {
        console.log(`   Lock ${index + 1}: Application ${lock.application_id} - ${lock.time_remaining} minutes remaining`);
      });
    }

    // Step 8: Test lock release by Judge 1
    console.log('\n8️⃣ Testing lock release by Judge 1...');
    const releaseLock = await axios.delete(`${API_BASE_URL}/judge/applications/${testApplicationId}/lock`, {
      headers: { 'Authorization': `Bearer ${judge1Token}` }
    });

    if (releaseLock.data.success) {
      console.log('✅ Lock released successfully');
    } else {
      console.log('❌ Lock release failed:', releaseLock.data.error);
    }

    // Step 9: Test lock acquisition by Judge 2 (should now succeed)
    console.log('\n9️⃣ Testing lock acquisition by Judge 2 (should now succeed)...');
    try {
      const lock2Retry = await axios.post(`${API_BASE_URL}/judge/applications/${testApplicationId}/lock`, {
        lock_type: 'review',
        lock_duration: 60
      }, {
        headers: { 'Authorization': `Bearer ${judge2Token}` }
      });
      
      if (lock2Retry.data.success) {
        console.log('✅ Judge 2 now able to acquire lock');
        console.log('   Lock expires at:', lock2Retry.data.data.lock.expires_at);
        console.log('   Time remaining:', lock2Retry.data.data.lock.time_remaining, 'minutes');
        
        // Clean up - release Judge 2's lock
        await axios.delete(`${API_BASE_URL}/judge/applications/${testApplicationId}/lock`, {
          headers: { 'Authorization': `Bearer ${judge2Token}` }
        });
        console.log('   Lock released by Judge 2');
      }
    } catch (error) {
      console.log('❌ Judge 2 still cannot acquire lock:', error.message);
    }

    console.log('\n🎉 Application Locking System Test Completed Successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the test
testApplicationLocking();
