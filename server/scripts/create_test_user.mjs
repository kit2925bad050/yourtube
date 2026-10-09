import dotenv from 'dotenv';
dotenv.config();
import mongoose from 'mongoose';
import User from '../Modals/Auth.js';
import jwt from 'jsonwebtoken';
import { connectDatabase } from '../config/database.js';

async function run() {
  try {
    await connectDatabase();
    console.log('Connected to MongoDB for test user creation');

    const email = 'ci-test+upload@example.com';
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({ email, name: 'CI Test User', passwordHash: '', channelname: 'CI Channel' });
      console.log('Created user:', user._id.toString());
    } else {
      console.log('Existing user found:', user._id.toString());
    }

    const secret = process.env.JWT_SECRET || 'test123';
    const token = jwt.sign({ id: user._id.toString() }, secret, { expiresIn: '7d' });
    console.log('TEST_TOKEN=' + token);
    process.exit(0);
  } catch (e) {
    console.error('Failed to create user:', e && e.message ? e.message : e);
    process.exit(1);
  }
}

run();
