#!/usr/bin/env node

import fetch from 'node-fetch';

const API_URL = 'http://localhost:3001/api';

async function deleteAllData() {
  try {
    console.log('🗑️  Deleting all opportunities...');
    const response = await fetch(`${API_URL}/opportunities`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    console.log('✅ Success:', data);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function getStatus() {
  try {
    console.log('\n📊 Webhook Server Status:\n');
    const response = await fetch(`${API_URL}/status`);
    const data = await response.json();
    console.log('Webhook Server:', data.webhookServer);
    console.log('Port:', data.port);
    console.log('Total Opportunities:', data.totalOpportunities);
    console.log('Unique Owners:', data.uniqueOwners.length > 0 ? data.uniqueOwners : 'None');
    console.log('\n📝 Available Endpoints:');
    Object.entries(data.endpoints).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  } catch (error) {
    console.error('❌ Error connecting to server:', error.message);
  }
}

async function getByEmail(email) {
  try {
    console.log(`\n👤 Opportunities for ${email}:\n`);
    const response = await fetch(`${API_URL}/opportunities/user/${email}`);
    const data = await response.json();
    console.log('Count:', data.count);
    console.log('Total Pipeline:', `$${data.totalPipeline}`);
    if (data.data.length > 0) {
      console.log('\nOpportunities:');
      data.data.forEach(opp => {
        console.log(`  - ${opp.name}: $${opp.amount} (${opp.stage_name})`);
      });
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

const command = process.argv[2];
const arg = process.argv[3];

switch (command) {
  case 'delete':
    deleteAllData();
    break;
  case 'status':
    getStatus();
    break;
  case 'user':
    if (arg) {
      getByEmail(arg);
    } else {
      console.log('Usage: node manage.mjs user <email>');
    }
    break;
  default:
    console.log('Webhook Data Manager\n');
    console.log('Commands:');
    console.log('  delete              - Delete all opportunities');
    console.log('  status              - Show server status');
    console.log('  user <email>        - Get opportunities for email\n');
    console.log('Examples:');
    console.log('  node manage.mjs delete');
    console.log('  node manage.mjs status');
    console.log('  node manage.mjs user sourabh.verman23@gmail.com');
}
