const http = require('http');

function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    console.log('Making request to:', options.hostname + ':' + options.port + options.path);
    
    const req = http.request(options, (res) => {
      console.log('Response received, status:', res.statusCode);
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log('Response data:', responseData);
        try {
          const parsedData = JSON.parse(responseData);
          resolve({
            status: res.statusCode,
            data: parsedData
          });
        } catch (error) {
          resolve({
            status: res.statusCode,
            data: { error: 'Invalid JSON response', raw: responseData }
          });
        }
      });
    });
    
    req.on('error', (error) => {
      console.log('Request error:', error.message);
      reject(error);
    });
    
    req.setTimeout(5000, () => {
      console.log('Request timeout');
      req.destroy();
      reject(new Error('Request timeout'));
    });
    
    if (data) {
      console.log('Sending data:', JSON.stringify(data));
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

async function testLogin() {
  try {
    console.log('Testing super admin login...');
    
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: '/api/auth/admin/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    const loginData = {
      email: 'superadmin@kasedaaward.com',
      password: 'superAdmin123@@'
    };
    
    const response = await makeRequest(options, loginData);
    console.log('Final response:', response);
    
  } catch (error) {
    console.log('Error:', error.message);
  }
}

testLogin();
