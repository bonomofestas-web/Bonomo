import http from 'http';

const testPayload = JSON.stringify({
  fileBase64: 'data:video/mp4;base64,' + Buffer.from('test mp4 content').toString('base64'),
  fileName: 'test_dev_video.mp4',
  contentType: 'video/mp4',
  folder: 'videos',
});

// Test port 5173 (standard Vite dev server)
const req = http.request(
  {
    hostname: 'localhost',
    port: 5173,
    path: '/api/upload',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testPayload),
    },
  },
  (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log('Status code from /api/upload on 5173:', res.statusCode);
      console.log('Response body:', data);
    });
  }
);

req.on('error', (err) => {
  console.log('Dev server not running on 5173 or connection error:', err.message);
});

req.write(testPayload);
req.end();
