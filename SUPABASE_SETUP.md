# Site QA Assistant - Supabase Setup Guide

## Prerequisites
- Supabase account (sign up at https://supabase.com)

## Step 1: Create a Supabase Project
1. Go to https://app.supabase.com
2. Click "New Project"
3. Enter project name (e.g., "qa-assistant")
4. Choose region closest to you
5. Create a strong password
6. Click "Create new project"

## Step 2: Get Your Credentials
1. Go to Settings → API
2. Copy your **Project URL** (starts with https://)
3. Copy your **Anon Public Key** (starts with eyJ...)

## Step 3: Update config.js
Open `config.js` and replace:
```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_URL'; // Paste your Project URL here
const SUPABASE_KEY = 'YOUR_SUPABASE_ANON_KEY'; // Paste your Anon Key here
```

## Step 4: Create Database Tables
1. In Supabase, go to SQL Editor
2. Create a new query
3. Run this SQL:

```sql
-- User profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  subscription_plan TEXT DEFAULT 'free',
  reports_created INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- Reports table
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  test_type TEXT,
  title TEXT,
  data JSONB,
  created_at TIMESTAMP DEFAULT now()
);

-- Enable RLS (Row Level Security)
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for user_profiles
CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create RLS policy for reports
CREATE POLICY "Users can view own reports"
  ON reports FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own reports"
  ON reports FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own reports"
  ON reports FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own reports"
  ON reports FOR DELETE
  USING (auth.uid() = user_id);
```

## Step 5: Enable Email Authentication
1. In Supabase, go to Authentication → Providers
2. Make sure "Email" is enabled
3. Go to Email Templates to customize if needed

## Step 6: Test the App
1. Open `index.html` in your browser
2. Sign up with an email and password
3. You should be able to create reports

## Features by Subscription
- **Free Plan**: 5 reports/month, basic features
- **Premium Plan**: Unlimited reports, AI analysis (once payment is integrated)

## Next Steps (Optional)
- Integrate Stripe for payments
- Add email notifications
- Create admin dashboard
- Add report sharing features

## Troubleshooting
- If auth doesn't work, check that SUPABASE_URL and SUPABASE_KEY are correct
- Make sure you've created the database tables
- Check browser console (F12) for error messages
