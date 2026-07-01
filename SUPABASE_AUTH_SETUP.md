# Supabase Auth Setup

## 1. Run the schema
Paste `supabase-schema.sql` into your Supabase SQL editor and run it.

## 2. Set the admin email
In Supabase → Settings → Configuration → set this custom config:
```
app.admin_email = raj.sidharthan@freshdesign.com
```
This locks model create/edit/delete to your account only.

## 3. Enable Google OAuth
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create an OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI:
   `https://<your-project>.supabase.co/auth/v1/callback`
4. In Supabase → Auth → Providers → Google:
   - Paste Client ID and Client Secret
   - Enable

## 4. Enable Facebook OAuth
1. Go to developers.facebook.com → Create App → Consumer
2. Add "Facebook Login" product
3. In Facebook Login → Settings, add redirect URI:
   `https://<your-project>.supabase.co/auth/v1/callback`
4. In Supabase → Auth → Providers → Facebook:
   - Paste App ID and App Secret
   - Enable

## 5. Set redirect URLs in Supabase
Supabase → Auth → URL Configuration:
- Site URL: `http://localhost:3000` (dev) / your production URL
- Redirect URLs: add both `http://localhost:3000/**` and your production URL

## 6. Add env vars
Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
ANTHROPIC_API_KEY=<your-anthropic-key>   # for AI model fill
```
