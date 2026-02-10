
const handler = require('./dist/index').default;

const req = {
  method: 'GET',
  url: '/',
  headers: {},
  query: {},
  body: {}
};

const res = {
  status: (code) => {
    console.log(`Response Status: ${code}`);
    return res;
  },
  json: (data) => {
    console.log('Response JSON:', JSON.stringify(data, null, 2));
    return res;
  },
  send: (data) => {
    console.log('Response Send:', data);
    return res;
  },
  setHeader: (key, value) => {
    console.log(`Set Header: ${key}=${value}`);
  }
};

(async () => {
  try {
    console.log('Invoking Vercel handler (dist)...');
    await handler(req, res);
  } catch (error) {
    console.error('Handler crashed:', error);
  }
})();
