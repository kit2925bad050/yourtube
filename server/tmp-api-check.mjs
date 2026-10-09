import fetch from 'node-fetch';

const base = 'http://127.0.0.1:5000/api/user';
const now = Date.now();
const email = `otp-api-check-${now}@example.com`;
const password = 'Password123!';

async function req(path, body) {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let bodyParsed = text;
  try {
    bodyParsed = JSON.parse(text);
  } catch (err) {
    // keep raw text
  }
  return { status: res.status, body: bodyParsed };
}

(async () => {
  console.log('email', email);
  const signup = await req('/signup', { email, password, name: 'API Check User' });
  console.log('SIGNUP', signup.status, signup.body);
  const login = await req('/login/email', { email, password });
  console.log('LOGIN_EMAIL', login.status, login.body);
  const requestOtp = await req('/request-otp', { email });
  console.log('REQUEST_OTP', requestOtp.status, requestOtp.body);
})();
