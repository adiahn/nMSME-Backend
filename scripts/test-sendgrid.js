require('dotenv').config({ path: './config.env' });
const nodemailer = require('nodemailer');

console.log('Testing SendGrid Configuration...');
console.log('SENDGRID_HOST:', process.env.SENDGRID_HOST);
console.log('SENDGRID_PORT:', process.env.SENDGRID_PORT);
console.log('SENDGRID_USERNAME:', process.env.SENDGRID_USERNAME);
console.log('SENDGRID_PASSWORD:', process.env.SENDGRID_PASSWORD ? '***SET***' : 'NOT SET');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

// Test SendGrid transporter
const createSendGridTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SENDGRID_HOST,
    port: process.env.SENDGRID_PORT,
    secure: false,
    auth: {
      user: process.env.SENDGRID_USERNAME,
      pass: process.env.SENDGRID_PASSWORD
    }
  });
};

async function testSendGrid() {
  try {
    console.log('\nCreating SendGrid transporter...');
    const transporter = createSendGridTransporter();
    
    console.log('Testing connection...');
    await transporter.verify();
    console.log('✅ SendGrid connection successful!');
    
    console.log('\nTesting email send...');
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: 'test@example.com',
      subject: 'SendGrid Test Email',
      text: 'This is a test email from SendGrid integration.',
      html: '<h1>SendGrid Test</h1><p>This is a test email from SendGrid integration.</p>'
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('Message ID:', info.messageId);
    
  } catch (error) {
    console.error('❌ SendGrid test failed:', error.message);
    console.error('Full error:', error);
  }
}

testSendGrid();
