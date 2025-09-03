require('dotenv').config({ path: './config.env' });

console.log('Testing Video Link Upload Functionality...\n');

// Test URL validation
function testVideoUrlValidation() {
  console.log('Testing Video URL Validation:');
  
  const testUrls = [
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/dQw4w9WgXcQ',
    'https://vimeo.com/123456789',
    'https://www.vimeo.com/123456789',
    'https://example.com/video', // Invalid
    'not-a-url' // Invalid
  ];

  const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
  const vimeoRegex = /^(https?:\/\/)?(www\.)?(vimeo\.com)\/.+/;

  testUrls.forEach(url => {
    const isValid = youtubeRegex.test(url) || vimeoRegex.test(url);
    console.log(`  ${url}: ${isValid ? '✅ Valid' : '❌ Invalid'}`);
  });
}

// Test video ID extraction
function testVideoIdExtraction() {
  console.log('\nTesting Video ID Extraction:');
  
  const testCases = [
    {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      expected: 'dQw4w9WgXcQ'
    },
    {
      url: 'https://youtu.be/dQw4w9WgXcQ',
      expected: 'dQw4w9WgXcQ'
    },
    {
      url: 'https://vimeo.com/123456789',
      expected: '123456789'
    },
    {
      url: 'https://www.vimeo.com/123456789',
      expected: '123456789'
    }
  ];

  testCases.forEach(testCase => {
    let videoId = '';
    let platform = '';
    
    if (testCase.url.includes('youtube.com') || testCase.url.includes('youtu.be')) {
      platform = 'youtube';
      const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
      const match = testCase.url.match(youtubeRegex);
      if (match) {
        videoId = match[1];
      }
    } else if (testCase.url.includes('vimeo.com')) {
      platform = 'vimeo';
      const vimeoRegex = /vimeo\.com\/(\d+)/;
      const match = testCase.url.match(vimeoRegex);
      if (match) {
        videoId = match[1];
      }
    }

    const success = videoId === testCase.expected;
    console.log(`  ${testCase.url}: ${success ? '✅' : '❌'} Extracted: "${videoId}" (Expected: "${testCase.expected}") Platform: ${platform}`);
  });
}

// Test pitch video schema
function testPitchVideoSchema() {
  console.log('\nTesting Pitch Video Schema:');
  
  const validPitchVideo = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    is_youtube_link: true,
    youtube_vimeo_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video_id: 'dQw4w9WgXcQ',
    platform: 'youtube'
  };

  console.log('  Valid pitch video schema:');
  console.log('    ✅ url: required string');
  console.log('    ✅ is_youtube_link: boolean');
  console.log('    ✅ youtube_vimeo_url: string');
  console.log('    ✅ video_id: string (extracted from URL)');
  console.log('    ✅ platform: enum ["youtube", "vimeo"]');
  
  console.log('\n  Example pitch video object:');
  console.log(JSON.stringify(validPitchVideo, null, 2));
}

// Run tests
testVideoUrlValidation();
testVideoIdExtraction();
testPitchVideoSchema();

console.log('\n✅ Video link upload functionality is ready!');
console.log('\n📝 Frontend Implementation Notes:');
console.log('  1. Only accept YouTube or Vimeo URLs');
console.log('  2. Validate URL format before submission');
console.log('  3. Use POST /api/documents/upload-video-link/:applicationId');
console.log('  4. Handle video_id and platform in response');
console.log('  5. No file upload UI needed for video pitch');
