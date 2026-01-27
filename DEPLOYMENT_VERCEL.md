# Deployment to Vercel

Complete guide for deploying Context Orchestrator to Vercel (production serverless platform).

## Prerequisites

- GitHub account with repository access
- Vercel account (free tier available)
- All environment variables configured
- Frontend and backend fully built

## Step 1: Prepare Your Repository

### 1.1 Ensure Code is Pushed to GitHub

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 1.2 Verify Project Structure

Your project should have:

```
context-orchestrator/
├── api/                    # Vercel API routes
│   ├── auth/
│   ├── meetings/
│   └── tasks/
├── web/                    # React frontend
│   ├── src/
│   ├── dist/              # Built output
│   ├── vite.config.ts
│   └── package.json
├── src/                    # Shared services
│   └── services/
├── vercel.json            # Deployment config
├── package.json           # Root package
└── tsconfig.json
```

## Step 2: Create Vercel Project

### 2.1 Connect GitHub to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in with GitHub
3. Click "New Project"
4. Select your GitHub repository
5. Vercel will auto-detect project settings

### 2.2 Configure Project

**Framework Preset**: Vite
**Build Command**: `npm run build`
**Output Directory**: `web/dist`
**Install Command**: `npm install`

**Important**: These should be auto-detected, but verify they're correct.

## Step 3: Configure Environment Variables

### 3.1 Add Environment Variables in Vercel

In Project Settings → Environment Variables, add:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_key
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_CALLBACK_URL=https://your-domain.vercel.app/auth/callback
MICROSOFT_TENANT_ID=common
SESSION_SECRET=your_random_secret_string
FIREFLIES_API_KEY=your_fireflies_key
ANTHROPIC_API_KEY=your_anthropic_key
CLICKUP_API_KEY=your_clickup_key
```

### 3.2 Set Production vs. Preview Environments

For sensitive values (secrets), set to production only:
- MICROSOFT_CLIENT_SECRET
- SESSION_SECRET
- ANTHROPIC_API_KEY
- SUPABASE_SERVICE_KEY

### 3.3 Generate Session Secret

Create a random secret string:

```bash
# On macOS/Linux
openssl rand -base64 32

# On Windows (PowerShell)
[Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((New-Guid).ToString())) | out-null; echo $?
```

Copy the output to `SESSION_SECRET`.

## Step 4: Configure OAuth Redirect URI

### 4.1 Update Azure AD App

1. Go to [portal.azure.com](https://portal.azure.com)
2. Navigate to App registrations
3. Select your app
4. Go to Authentication
5. Add Redirect URI:
   - **Add a redirect URI**: https://your-vercel-domain.vercel.app/auth/callback
   - Example: `https://context-orchestrator-abc123.vercel.app/auth/callback`

### 4.2 Get Your Vercel Domain

After first deployment, Vercel provides:
- Auto-generated domain (project-slug.vercel.app)
- Custom domain option

## Step 5: Deploy

### 5.1 Trigger Deployment

Vercel auto-deploys on `git push`. Alternatively:

```bash
npm install -g vercel
vercel --prod
```

### 5.2 Monitor Deployment

In Vercel Dashboard:
1. Go to Deployments
2. Watch build progress
3. Check Logs if there are errors
4. Once complete, your app is live

### 5.3 Wait for API Routes to Deploy

API routes take 1-2 minutes to initialize serverless functions. First request may be slightly slower.

## Step 6: Post-Deployment Verification

### 6.1 Test Health Endpoint

```bash
curl https://your-domain.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-12-10T..."
}
```

### 6.2 Test Frontend

1. Open https://your-domain.vercel.app
2. Should see login page
3. Click "Sign in with Microsoft"
4. Should redirect to Microsoft login

### 6.3 Test OAuth Flow

1. Complete Microsoft OAuth sign-in
2. Should redirect back to dashboard
3. Check browser console for errors

### 6.4 Test API Endpoints

```bash
# Get meetings (requires auth - will fail without session)
curl https://your-domain.vercel.app/api/meetings/list?from=2024-12-01&to=2024-12-31
```

## Troubleshooting

### Build Failures

**Error**: `npm ERR! Missing required argument: packages`

Solution: Ensure `npm install` is set as install command in Vercel settings.

**Error**: `TypeScript compilation failed`

Solution: Check for type errors:
```bash
npm run build locally first
tsc --noEmit
```

### Runtime Errors

**Error**: `SUPABASE_URL not found`

Solution:
1. Verify env vars in Vercel dashboard
2. Ensure variables are set for production
3. Redeploy after adding variables

**Error**: `Cannot find module` (in API routes)

Solution:
1. Verify all dependencies in package.json
2. Ensure relative imports use `.js` extension
3. Check TypeScript configuration

### OAuth Issues

**Error**: `Invalid redirect_uri`

Solution:
1. Verify MICROSOFT_CALLBACK_URL matches Azure AD config
2. Include protocol (https://)
3. Match domain exactly

**Error**: Redirect loop

Solution:
1. Check that auth token is stored correctly
2. Verify session storage works in serverless
3. Check browser cookies are enabled

### API Connection Issues

**Error**: API calls fail from frontend

Solution:
1. Check CORS is configured (should be automatic)
2. Verify credentials: true in axios config
3. Check network tab in browser DevTools
4. Verify /api/* routes in vercel.json

### Database Connection Issues

**Error**: Cannot connect to Supabase

Solution:
1. Verify SUPABASE_URL is correct
2. Verify SUPABASE_ANON_KEY is valid
3. Test locally: `npm run dev:api`
4. Check Supabase project status

## Advanced Configuration

### Custom Domain

1. In Vercel dashboard, go to Settings → Domains
2. Add your domain
3. Follow DNS configuration steps
4. Update MICROSOFT_CALLBACK_URL to custom domain
5. Update Azure AD app redirect URI

### Monitoring & Logging

1. Go to Monitoring in Vercel dashboard
2. Check Function Logs for errors
3. Monitor CPU, memory usage
4. Set up alerts for failures

### Scale Up (if needed)

Vercel free tier supports:
- ✅ Unlimited deployments
- ✅ Unlimited API routes
- ✅ 10 seconds function timeout
- ✅ 512 MB memory per function

For production with higher load:
- Upgrade to Pro ($20/month)
- 60 seconds function timeout
- 1024 MB memory per function
- Priority support

## Security Best Practices

### 1. Rotate Secrets

Periodically rotate sensitive variables:
- SESSION_SECRET
- ANTHROPIC_API_KEY
- MICROSOFT_CLIENT_SECRET

### 2. Use Environment-Specific Values

Different secrets for staging vs. production:

```bash
# Staging
MICROSOFT_CALLBACK_URL=https://staging-app.vercel.app/auth/callback

# Production
MICROSOFT_CALLBACK_URL=https://app.example.com/auth/callback
```

### 3. Monitor API Usage

- Anthropic API: ~$0.01-0.02 per meeting processed
- Fireflies: API included in free tier
- ClickUp: API included in subscription
- Vercel: Free tier covers most use cases

### 4. Enable HTTPS Only

Vercel provides HTTPS automatically. Ensure:
- All external API calls use HTTPS
- OAuth redirects use HTTPS
- Database connections use TLS

## Updating Your Deployment

### 1. Make Code Changes Locally

```bash
git checkout -b feature/my-feature
npm run dev:all  # Test locally
```

### 2. Commit and Push

```bash
git add .
git commit -m "Add new feature"
git push origin feature/my-feature
```

### 3. Create Pull Request (optional)

Vercel will create preview deployment for PR.

### 4. Merge to Main

Once merged, Vercel auto-deploys production.

## Rollback

If deployment has issues:

1. Go to Vercel Deployments
2. Find previous working deployment
3. Click "Promote to Production"
4. Verify it works

## Disaster Recovery

### Backup Supabase Data

```bash
# Supabase provides automatic backups
# Go to Supabase dashboard → Backups
```

### Backup Environment Variables

Store in secure location (1Password, LastPass, etc.):
- MICROSOFT_CLIENT_SECRET
- SESSION_SECRET
- API keys

### Keep Local Copy

```bash
# Save .env locally (never commit!)
cp .env .env.backup
```

## Performance Optimization

### API Route Optimization

- Keep functions < 50 MB
- Minimize dependencies
- Cache database queries
- Use connection pooling for Supabase

### Frontend Optimization

- Enable gzip compression (Vercel default)
- Code splitting via Vite
- Image optimization
- Cache static assets (handled by Vercel)

### Monitoring Performance

1. Use Vercel Analytics
2. Check function duration
3. Monitor database query times
4. Check API response times

## Support & Help

### Vercel Documentation

- [Vercel Docs](https://vercel.com/docs)
- [Environment Variables](https://vercel.com/docs/projects/environment-variables)
- [API Reference](https://vercel.com/docs/rest-api)

### Debugging

Enable verbose logging:

```bash
vercel env list
vercel logs [function-name]
```

## Checklist: Pre-Deployment

- [ ] All code committed to GitHub
- [ ] Environment variables configured in Vercel
- [ ] Microsoft Azure AD redirect URI updated
- [ ] Build succeeds locally: `npm run build`
- [ ] Tests pass: `npm run test`
- [ ] No type errors: `tsc --noEmit`
- [ ] Frontend builds: `cd web && npm run build`
- [ ] Health endpoint tested locally
- [ ] OAuth flow tested locally with ngrok

## Checklist: Post-Deployment

- [ ] Health endpoint responds
- [ ] Frontend loads at https://your-domain
- [ ] Login page displays
- [ ] OAuth login works
- [ ] Dashboard loads after login
- [ ] API endpoints respond
- [ ] Database queries work
- [ ] No console errors in browser
- [ ] Vercel logs show no errors
- [ ] Performance is acceptable

## Next Steps

Once deployed to production:

1. **Monitor**: Set up error tracking (Sentry)
2. **Test**: Run end-to-end tests
3. **Optimize**: Monitor performance and optimize
4. **Scale**: Add caching, CDN if needed
5. **Maintain**: Regular updates and security patches

---

**Deployment Status**: Ready for production
**Last Updated**: 2024-12-10
**Next Review**: When making deployment changes
