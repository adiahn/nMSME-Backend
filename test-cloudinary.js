require('dotenv').config({ path: './config.env' });
const cloudinary = require('cloudinary').v2;

console.log('Testing Cloudinary Configuration...');
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME);
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY);
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? '***SET***' : 'NOT SET');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function testCloudinary() {
  try {
    console.log('\nTesting Cloudinary connection...');
    
    // Test the connection by getting account info
    const result = await cloudinary.api.ping();
    console.log('✅ Cloudinary connection successful!');
    console.log('Response:', result);
    
    // Test folder creation/list
    console.log('\nTesting folder access...');
    const folders = await cloudinary.api.root_folders();
    console.log('✅ Folder access successful!');
    console.log('Available folders:', folders.folders.map(f => f.name));
    
    console.log('\n🎉 Cloudinary is configured and working correctly!');
    
  } catch (error) {
    console.error('❌ Cloudinary test failed:', error.message);
    console.error('Full error:', error);
  }
}

testCloudinary();
