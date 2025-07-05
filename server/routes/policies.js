import express from 'express';
import { scrapeGovernmentSites } from '../services/scraper.js';
import { analyzeWithGemini, generateDraftResponse } from '../services/gemini.js';
import { sendTestEmail } from '../services/email.js';
import { loadPolicies, addPolicy, updatePolicyAnalysis, clearPolicies } from '../services/policyStorage.js';

const router = express.Router();

// Get all policies from storage
router.get('/', async (req, res) => {
  try {
    const policies = loadPolicies();
    res.json(policies);
  } catch (error) {
    console.error('Error fetching policies:', error);
    res.status(500).json({ error: 'Failed to fetch policies' });
  }
});

// Get specific policy by ID
router.get('/:id', async (req, res) => {
  try {
    const policies = loadPolicies();
    const policy = policies.find(p => p.id === req.params.id);
    
    if (!policy) {
      return res.status(404).json({ error: 'Policy not found' });
    }
    
    res.json(policy);
  } catch (error) {
    console.error('Error fetching policy:', error);
    res.status(500).json({ error: 'Failed to fetch policy' });
  }
});

// Analyze a specific policy
router.post('/analyze', async (req, res) => {
  try {
    const { policy } = req.body;
    if (!policy) {
      return res.status(400).json({ error: 'Policy data required' });
    }
    
    const analysis = await analyzeWithGemini(policy);
    
    // If policy has an ID, update it in storage
    if (policy.id) {
      const enhancedAnalysis = {
        ...analysis,
        draftsGenerated: 3,
        drafts: {
          legal: '',
          emotional: '',
          dataBacked: ''
        }
      };
      updatePolicyAnalysis(policy.id, enhancedAnalysis);
    }
    
    res.json(analysis);
  } catch (error) {
    console.error('Error analyzing policy:', error);
    res.status(500).json({ error: 'Failed to analyze policy' });
  }
});

// Generate draft response
router.post('/generate-draft', async (req, res) => {
  try {
    const { policy, tone } = req.body;
    if (!policy || !tone) {
      return res.status(400).json({ error: 'Policy and tone required' });
    }
    
    const draft = await generateDraftResponse(policy, tone);
    
    // Update policy in storage with the new draft
    if (policy.id) {
      const policies = loadPolicies();
      const policyIndex = policies.findIndex(p => p.id === policy.id);
      
      if (policyIndex >= 0 && policies[policyIndex].aiAnalysis) {
        policies[policyIndex].aiAnalysis.drafts = {
          ...policies[policyIndex].aiAnalysis.drafts,
          [tone]: draft
        };
        
        updatePolicyAnalysis(policy.id, policies[policyIndex].aiAnalysis);
      }
    }
    
    res.json({ draft });
  } catch (error) {
    console.error('Error generating draft:', error);
    res.status(500).json({ error: 'Failed to generate draft' });
  }
});

// Clear all policies (for testing)
router.delete('/clear', async (req, res) => {
  try {
    clearPolicies();
    res.json({ message: 'All policies cleared successfully' });
  } catch (error) {
    console.error('Error clearing policies:', error);
    res.status(500).json({ error: 'Failed to clear policies' });
  }
});

// Test email functionality
router.post('/test-email', async (req, res) => {
  try {
    await sendTestEmail();
    res.json({ message: 'Test email sent successfully' });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
});

export { router as policyRoutes };