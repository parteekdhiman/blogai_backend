
// Clear MONGODB_URI to simulate missing env var
delete process.env.MONGODB_URI;

// Import handler - this triggers env.config.ts load
import handler from './src/index';

const req = {
  method: 'GET',
  url: '/',
  headers: {},
  query: {},
  body: {}
};

const res = {
  status: (code: number) => {
    console.log(`Response Status: ${code}`);
    return res;
  },
  json: (data: any) => {
    console.log('Response JSON:', JSON.stringify(data, null, 2));
    return res;
  },
  send: (data: any) => {
    console.log('Response Send:', data);
    return res;
  },
  setHeader: (key: string, value: string) => {
    console.log(`Set Header: ${key}=${value}`);
  }
};

(async () => {
  try {
    console.log('Invoking Vercel handler with missing env vars...');
    await handler(req, res);
  } catch (error) {
    console.error('Handler crashed:', error);
  }
})();
