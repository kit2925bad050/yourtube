import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const BASE = 'http://127.0.0.1:5000/api/user';
const now = Date.now();
const testEmail = `otp-test-${now}@example.com`;
const testPassword = 'Password123!';

const results = [];
const print = (title, value) => {
  results.push(`=== ${title} ===`);
  results.push(value);
};

const req = async (method, url, body) => {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let parsed = text;
  try {
    parsed = JSON.parse(text);
  } catch (e) {}
  return { status: res.status, body: parsed, raw: text };
};

try {
  print('health', JSON.stringify(await req('GET', 'http://127.0.0.1:5000/api/health'), null, 2));

  const signup = await req('POST', `${BASE}/signup`, { email: testEmail, password: testPassword, name: 'OTP Test User' });
  print('signup', JSON.stringify(signup, null, 2));

  const requestOtp = await req('POST', `${BASE}/request-otp`, { email: testEmail });
  print('requestOtp', JSON.stringify(requestOtp, null, 2));

  await mongoose.connect(process.env.DB_URL, { serverSelectionTimeoutMS: 10000, connectTimeoutMS: 10000 });
  const schema = new mongoose.Schema({}, { strict: false, collection: 'users' });
  const User = mongoose.models.TempUser || mongoose.model('TempUser', schema);
  const found = await User.findOne({ email: testEmail }).lean();
  print('dbUser', JSON.stringify({
    email: found?.email,
    otpCodeExists: found?.otpCode !== undefined,
    otpCode: found?.otpCode ? '[SET]' : undefined,
    otpExpires: found?.otpExpires,
    keys: found ? Object.keys(found).filter((k) => ['otpCode','otpExpires','email','passwordHash','name'].includes(k)).sort() : []
  }, null, 2));

  const otpFromDb = found?.otpCode;
  if (!otpFromDb) {
    print('otpFetch', 'OTP code not found in DB');
  } else {
    const verifyOtp = await req('POST', `${BASE}/verify-otp`, { email: testEmail, otp: otpFromDb });
    print('verifyOtp', JSON.stringify(verifyOtp, null, 2));
  }

  const loginEmail = await req('POST', `${BASE}/login/email`, { email: testEmail, password: testPassword });
  print('loginEmail', JSON.stringify(loginEmail, null, 2));

  const isExposed = (obj) => /otp|otpCode|verificationCode/i.test(JSON.stringify(obj));
  print('exposureCheck', JSON.stringify({
    signup: isExposed(signup.body),
    requestOtp: isExposed(requestOtp.body),
    verifyOtp: otpFromDb ? isExposed((await req('POST', `${BASE}/verify-otp`, { email: testEmail, otp: otpFromDb })).body) : false,
    loginEmail: isExposed(loginEmail.body),
  }, null, 2));
} catch (err) {
  print('error', err.stack || err.message || err);
} finally {
  console.log(results.join('\n'));
  process.exit(0);
}
