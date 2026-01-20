# Salesforce Webhook Integration Guide

## Overview
This application receives opportunity data from Salesforce via webhook and filters it by the logged-in user's email matching the opportunity owner's email.

## Webhook Endpoint

**URL:** `http://localhost:3001/api/webhook`  
**Method:** POST  
**Content-Type:** application/json

## Webhook Payload Format

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

## How It Works

1. **Receive Webhook:** Salesforce sends opportunity data to the webhook endpoint
2. **Store Data:** Opportunities are stored in the `salesforce_opportunities` table
3. **Email Matching:** The app filters opportunities where `owner_email` matches the logged-in user's email
4. **Display:** Only matching opportunities are shown in the dashboard

## Testing the Webhook

You can test with this curl command:

```bash
curl -X POST http://localhost:3001/api/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "opportunities": [
      {
        "id": "006xx000000001",
        "name": "Test Deal",
        "accountId": "001xx000000001",
        "accountName": "Test Account",
        "amount": 50000,
        "stageName": "Prospecting",
        "probability": 25,
        "closeDate": "2026-02-28",
        "ownerId": "005xx000000001",
        "ownerName": "Test Owner",
        "ownerEmail": "sourabh.verman23@gmail.com",
        "opportunityType": "New Business",
        "updatedAt": "2026-01-20T10:30:00Z"
      }
    ],
    "timestamp": "2026-01-20T10:30:00Z"
  }'
```

## User Experience

### When Email Matches:
- Dashboard shows opportunities from Salesforce
- Pipeline, forecast, and metrics are populated

### When Email Doesn't Match:
- Dashboard shows $0 pipeline
- No opportunities displayed
- Message: "No opportunities" or zero metrics

## Database Table Schema

The webhook stores data in `salesforce_opportunities` table:

```sql
- sf_opportunity_id (Salesforce ID)
- name
- account_id
- account_name
- amount
- stage_name
- probability
- close_date
- owner_id
- owner_name
- owner_email (lowercase for comparison)
- opportunity_type
- updated_at
```

## Environment Variables Required

```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-key
```
