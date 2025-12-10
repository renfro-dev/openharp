# Quick Deploy to Replit

Deploy your Fireflies webhook server to Replit in 5 minutes!

## Step-by-Step Deployment

### 1. Create a Replit Account
Go to https://replit.com and sign up (free tier works fine for testing).

### 2. Import This Project

**Option A: From GitHub**
1. Push your code to GitHub (if not already)
2. In Replit, click **+ Create Repl**
3. Select **Import from GitHub**
4. Paste your repository URL

**Option B: Upload Code**
1. In Replit, click **+ Create Repl**
2. Select **Node.js**
3. Drag and drop your project folder

### 3. Add Environment Secrets

Click the **Lock icon (🔒)** or go to **Tools → Secrets** and add these:

```
FIREFLIES_API_KEY
your_fireflies_api_key_here

PLANNER_PLAN_ID
your_planner_plan_id_here

ANTHROPIC_API_KEY
your_anthropic_api_key_here

TEAMS_TEAM_NAME
Your Team Name

TEAMS_CHANNEL_NAME
ClickUp Task Orchestrator

CLICKUP_LIST_ID
your_clickup_list_id_here

CLICKUP_API_KEY
your_clickup_api_key_here

CLICKUP_TEAM_ID
your_clickup_team_id_here
```

**Important:** Add each as a separate secret (key-value pair), don't paste as a block.

### 4. Authenticate with Microsoft 365

In the Replit **Shell** tab (bottom panel), run:

```bash
npx -y @softeria/ms-365-mcp-server --org-mode --login
```

1. You'll get a device code and URL
2. Go to https://microsoft.com/devicelogin
3. Enter the code
4. Sign in as: **jrenfro@cageandmiles.com**
5. Return to Replit once authenticated

The authentication tokens will be cached on the Replit server.

### 5. Run the Server

Click the big green **Run** button at the top!

The server will:
- Install dependencies automatically
- Start the webhook server
- Display your public HTTPS URL

Look for output like:
```
🌐 Public URL: https://your-repl.your-username.repl.co
📍 Webhook endpoint: https://your-repl.your-username.repl.co/webhook/fireflies
```

**Copy this webhook URL!** You'll need it for Fireflies.

### 6. Test the Server

Open a new browser tab and visit:
```
https://your-repl.your-username.repl.co/health
```

You should see:
```json
{"status":"ok","timestamp":"2025-12-10T..."}
```

### 7. Configure Fireflies Webhook

1. Log in to Fireflies.ai
2. Go to **Settings** → **Integrations** → **Webhooks**
3. Click **Add Webhook**
4. Paste your Replit URL + `/webhook/fireflies`:
   ```
   https://your-repl.your-username.repl.co/webhook/fireflies
   ```
5. Select **Transcript Ready** event
6. Click **Save**

### 8. Enable Always-On (Recommended)

**Free Tier:** Your Repl will sleep after 1 hour of inactivity

**Hacker Plan ($7/month):**
1. Click ⚙️ Settings in your Repl
2. Enable **Always On** toggle
3. Your server never sleeps!

**Free Tier Workaround:**
Use [UptimeRobot](https://uptimerobot.com) (free) to ping your health endpoint every 5 minutes:
```
https://your-repl.your-username.repl.co/health
```

This keeps your Repl awake during business hours.

## Testing Your Deployment

### Manual Test

In the Replit Shell or using curl:

```bash
curl -X POST https://your-repl.your-username.repl.co/trigger/01KBR8ZMVYFHKG1BFS6D523E7K
```

Watch the **Console** tab to see the workflow execute.

### Live Test

1. Have a meeting recorded by Fireflies (or wait for next one)
2. When Fireflies finishes processing, check your Repl console
3. You should see the webhook trigger and tasks post to Teams
4. Go to Teams → RevOps → Clickup Task Orchestrator channel
5. Verify tasks appear
6. React with 👍 to approve
7. Run check-approvals later (can set up as cron)

## Check Approvals Workflow

After tasks are approved in Teams, you need to check approvals and create ClickUp tasks.

### Option 1: Manual (For Testing)

In Replit Shell:
```bash
npm run dev -- check-approvals
```

### Option 2: Scheduled (Recommended)

Use Replit's cron feature or create a second Repl that runs periodically:

1. Create a new Repl called "check-approvals-cron"
2. Add same secrets
3. Create `check-approvals.sh`:
   ```bash
   #!/bin/bash
   cd /home/runner/your-main-repl
   npm run dev -- check-approvals
   ```
4. Set up cron to run every 30 minutes

### Option 3: Add HTTP Endpoint

Add to your main server for manual triggering:

```bash
curl -X POST https://your-repl.your-username.repl.co/check-approvals
```

## Monitoring

### View Logs
Click the **Console** tab in Replit to see real-time logs.

### Check Server Status
```bash
curl https://your-repl.your-username.repl.co/health
```

### View Processed Meetings
In Replit Shell:
```bash
cat .state/processed-meetings.json
```

## Troubleshooting

### Server Won't Start
1. Check all Secrets are added correctly
2. Make sure `.replit` file exists
3. Try running `npm install` manually in Shell

### Webhook Not Receiving Events
1. Verify Fireflies webhook URL is correct
2. Check it's HTTPS (Replit provides this automatically)
3. Test with manual trigger first
4. Check Fireflies webhook delivery logs

### MS365 Authentication Expired
Re-run in Shell:
```bash
npx -y @softeria/ms-365-mcp-server --org-mode --login
```

### Repl Keeps Sleeping
- Upgrade to Hacker plan for Always On
- Or use UptimeRobot to ping `/health` every 5 minutes

## Cost

**Free Tier:**
- ✅ Perfect for testing
- ✅ Public HTTPS URL
- ❌ Sleeps after inactivity
- ❌ 500 MB storage

**Hacker Plan ($7/month):**
- ✅ Always On (never sleeps)
- ✅ 5 GB storage
- ✅ Faster CPUs
- ✅ Better for production

## Production Checklist

- [ ] All environment secrets added
- [ ] MS365 authenticated
- [ ] Server running and accessible
- [ ] Health endpoint responding
- [ ] Fireflies webhook configured
- [ ] Test meeting processed successfully
- [ ] Tasks appearing in Teams
- [ ] Approval workflow tested
- [ ] Always On enabled (or UptimeRobot configured)
- [ ] Check-approvals scheduled

## Next Steps

Once deployed:
1. Test with a real meeting
2. Verify full workflow (Fireflies → Teams → ClickUp)
3. Set up approval checking (manual or scheduled)
4. Monitor for a few days
5. Enable Always On for production use

## Support

Issues? Check:
1. Replit Console for errors
2. Fireflies webhook delivery logs (Settings → Webhooks)
3. Teams channel for posted tasks
4. `.state/` directory for tracking files

Your webhook server is now live and ready to automatically process Fireflies meetings! 🚀
