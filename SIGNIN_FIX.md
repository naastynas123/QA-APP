# Sign In Not Working - Fix Guide

## Issue
The sign in feature requires email confirmation, which is blocking signup.

## Solution
You need to **disable email confirmation** in your Supabase project settings:

1. Go to: https://app.supabase.com/
2. Select your project **rpsxigsbyvyrzpvaukvv**
3. Go to **Authentication** → **Providers** (left sidebar)
4. Click on **Email**
5. Toggle **"Confirm email"** to **OFF**
6. Click **Save**

Alternative method:
1. Go to **Authentication** → **Settings** (left sidebar)
2. Under **Email Confirmations**, toggle **"Enable email confirmations"** to **OFF**
3. Click **Save**

## After Disabling
- Refresh the app in your browser
- Try signing up with any email and password (password must be 6+ characters)
- You should be able to sign in immediately after signup

## Test Account
- Email: test@example.com
- Password: test123456

If email verification is still required, check that the setting was saved properly and refresh your browser's cache (Cmd+Shift+R on Mac).
