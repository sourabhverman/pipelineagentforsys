# Data Management Guide

## Clean Start: Delete All Data & Resend from Salesforce

### Step 1: Delete All Existing Data

**Option A: Using npm command**
```bash
npm run clean
```

**Option B: Using curl**
```bash
curl -X DELETE http://localhost:3001/api/opportunities
```

**Option C: Using node directly**
```bash
node manage.mjs delete
```

### Step 2: Check Status
```bash
npm run status
```

Expected output:
```
Total Opportunities: 0
Unique Owners: []
```

### Step 3: Resend Data from Salesforce

Configure your Salesforce webhook to send to:
```
http://your-server:3001/api/webhook
```

Example payload:
```json
{
  "opportunities": [
    {
      "id": "006xx000000001",
      "name": "Acme Corp Deal",
      "accountId": "001xx000000001",
      "accountName": "Acme Corporation",
      "amount": 50000,
      "stageName": "Negotiation/Review",
      "probability": 75,
      "closeDate": "2026-02-28",
      "ownerId": "005xx000000001",
      "ownerName": "John Smith",
      "ownerEmail": "sourabh.verman23@gmail.com",
      "opportunityType": "New Business",
      "updatedAt": "2026-01-20T10:30:00Z"
    }
  ],
  "timestamp": "2026-01-20T10:30:00Z"
}
```

### Step 4: Verify Data Received

**Check all opportunities:**
```bash
curl http://localhost:3001/api/opportunities
```

**Check for specific user:**
```bash
npm run user sourabh.verman23@gmail.com
```

Or using curl:
```bash
curl http://localhost:3001/api/opportunities/user/sourabh.verman23@gmail.com
```

## Available API Endpoints

### 1. Send Webhook Data
```
POST /api/webhook
```
Send opportunities from Salesforce

### 2. Get All Opportunities
```
GET /api/opportunities
```
Returns all stored opportunities

### 3. Delete All Opportunities
```
DELETE /api/opportunities
```
Clears all data (fresh start)

### 4. Get User-Level Data
```
GET /api/opportunities/user/:email
```
Returns only opportunities for that email

### 5. Get Server Status
```
GET /api/status
```
Shows server info and all endpoints

### 6. Health Check
```
GET /api/health
```
Simple status check

## Quick Commands

```bash
# Check webhook server status
npm run status

# Delete all data
npm run clean

# Check data for user
npm run user sourabh.verman23@gmail.com

# Start both dev and webhook server
npm run dev:full

# Start only webhook server
npm run server

# Check specific email
curl http://localhost:3001/api/opportunities/user/sourabh.verman23@gmail.com
```

## How User-Level Filtering Works

1. Salesforce sends webhook with `ownerEmail`
2. Server stores opportunities with lowercase owner email
3. Frontend filters by logged-in user's email
4. Only matching opportunities are displayed

### Example:
- User logged in: `sourabh.verman23@gmail.com`
- Opportunity owner: `sourabh.verman23@gmail.com`
- **Result:** ✅ Opportunity shown

- User logged in: `different@gmail.com`
- Opportunity owner: `sourabh.verman23@gmail.com`
- **Result:** ❌ Opportunity NOT shown (all metrics = $0)

## Testing Workflow

```bash
# 1. Start servers
npm run dev:full

# 2. Clean data
npm run clean

# 3. Check status (should be empty)
npm run status

# 4. Send test webhook
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "opportunities": [{
      "id": "test1",
      "name": "Test Deal",
      "accountId": "acc1",
      "accountName": "Test Account",
      "amount": 100000,
      "stageName": "Prospecting",
      "probability": 50,
      "closeDate": "2026-02-28",
      "ownerId": "owner1",
      "ownerName": "Test Owner",
      "ownerEmail": "sourabh.verman23@gmail.com",
      "opportunityType": "New Business",
      "updatedAt": "2026-01-20T12:00:00Z"
    }],
    "timestamp": "2026-01-20T12:00:00Z"
  }'

# 5. Check if data was received
npm run user sourabh.verman23@gmail.com

# 6. View in app at http://localhost:8081
```

## Troubleshooting

**Webhook returns error?**
- Check email format (should be lowercase in request)
- Verify Supabase credentials
- Check `salesforce_opportunities` table exists

**No opportunities showing in app?**
- Check logged-in user email matches webhook owner email
- Verify data was stored: `npm run status`
- Check specific user: `npm run user your-email@gmail.com`

**Server not responding?**
- Check server is running: `npm run server`
- Check port 3001 is available
- Check `.env` has Supabase credentials
