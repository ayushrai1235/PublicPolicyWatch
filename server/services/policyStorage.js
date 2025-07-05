import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const POLICIES_FILE = path.join(__dirname, '../data/policies.json');

// Ensure data directory exists
const dataDir = path.dirname(POLICIES_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize empty policies file if it doesn't exist
if (!fs.existsSync(POLICIES_FILE)) {
  fs.writeFileSync(POLICIES_FILE, JSON.stringify([], null, 2));
}

export function loadPolicies() {
  try {
    const data = fs.readFileSync(POLICIES_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading policies:', error);
    return [];
  }
}

export function savePolicies(policies) {
  try {
    fs.writeFileSync(POLICIES_FILE, JSON.stringify(policies, null, 2));
    console.log(`💾 Saved ${policies.length} policies to storage`);
    return true;
  } catch (error) {
    console.error('Error saving policies:', error);
    return false;
  }
}

export function addPolicy(policy) {
  const policies = loadPolicies();
  
  // Check if policy already exists
  const existingIndex = policies.findIndex(p => p.id === policy.id);
  
  if (existingIndex >= 0) {
    // Update existing policy
    policies[existingIndex] = { ...policies[existingIndex], ...policy };
    console.log(`📝 Updated existing policy: ${policy.title.substring(0, 50)}...`);
  } else {
    // Add new policy
    policies.push(policy);
    console.log(`➕ Added new policy: ${policy.title.substring(0, 50)}...`);
  }
  
  savePolicies(policies);
  return policies;
}

export function updatePolicyAnalysis(policyId, analysis) {
  const policies = loadPolicies();
  const policyIndex = policies.findIndex(p => p.id === policyId);
  
  if (policyIndex >= 0) {
    policies[policyIndex].aiAnalysis = analysis;
    policies[policyIndex].lastAnalyzed = new Date().toISOString();
    savePolicies(policies);
    console.log(`🧠 Updated AI analysis for policy: ${policies[policyIndex].title.substring(0, 50)}...`);
    return true;
  }
  
  return false;
}

export function getPolicyById(id) {
  const policies = loadPolicies();
  return policies.find(p => p.id === id);
}

export function clearPolicies() {
  savePolicies([]);
  console.log('🗑️ Cleared all policies from storage');
}

export function getStats() {
  const policies = loadPolicies();
  
  return {
    total: policies.length,
    analyzed: policies.filter(p => p.aiAnalysis).length,
    pending: policies.filter(p => !p.aiAnalysis).length,
    relevant: policies.filter(p => p.aiAnalysis?.isAnimalWelfare).length,
    urgent: policies.filter(p => {
      const daysLeft = Math.ceil((new Date(p.deadline) - new Date()) / (1000 * 60 * 60 * 24));
      return daysLeft <= 7;
    }).length
  };
}