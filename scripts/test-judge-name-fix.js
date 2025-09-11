const axios = require('axios');

async function testJudgeNameFix() {
  try {
    console.log('🧪 TESTING JUDGE NAME FIX\n');
    
    const response = await axios.get('http://localhost:5000/api/public/reviewed-applications');
    
    console.log('📊 RESPONSE:');
    console.log(`   Status: ${response.status}`);
    console.log(`   Count: ${response.data.count}`);
    
    if (response.data.applications && response.data.applications.length > 0) {
      const app = response.data.applications[0];
      console.log(`\n📋 APPLICATION: ${app.business_name}`);
      console.log(`   Workflow Stage: ${app.workflow_stage}`);
      
      if (app.scoring && app.scoring.scores && app.scoring.scores.length > 0) {
        const score = app.scoring.scores[0];
        console.log(`\n👨‍⚖️ JUDGE: ${score.judge_name}`);
        console.log(`   Score: ${score.total_score}/100`);
        console.log(`   Grade: ${score.grade}`);
        console.log(`   Comments: ${score.comments}`);
        
        if (score.judge_name === 'undefined undefined') {
          console.log('\n❌ JUDGE NAME STILL SHOWING AS UNDEFINED');
        } else {
          console.log('\n✅ JUDGE NAME FIXED!');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testJudgeNameFix();
