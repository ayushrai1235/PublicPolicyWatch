import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cron from 'node-cron';
import { scrapeGovernmentSites } from './services/scraper.js';
import { analyzeWithGemini } from './services/gemini.js';
import { sendEmailNotification } from './services/email.js';
import { policyRoutes } from './routes/policies.js';
import { loadPolicies, savePolicies, addPolicy, updatePolicyAnalysis, getStats } from './services/policyStorage.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/policies', policyRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const stats = getStats();
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    message: 'Animal Welfare Policy Monitor is running',
    services: {
      scraper: 'Active',
      gemini: process.env.GEMINI_API_KEY ? 'Configured' : 'Not configured',
      email: process.env.EMAIL_USER ? 'Configured' : 'Not configured'
    },
    stats
  });
});

// Manual trigger for scraping (for testing)
app.post('/api/scrape', async (req, res) => {
  try {
    console.log('🚀 Manual scraping triggered via API...');
    const result = await performPolicyCheck(true); // Force scraping
    res.json({ 
      message: 'Scraping completed successfully',
      policiesFound: result?.newPolicies || 0,
      totalPolicies: result?.totalPolicies || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Manual scraping failed:', error);
    res.status(500).json({ 
      error: 'Scraping failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Auto-analyze pending policies
app.post('/api/analyze-pending', async (req, res) => {
  try {
    console.log('🧠 Auto-analyzing pending policies...');
    const result = await analyzePendingPolicies();
    res.json({
      message: 'Analysis completed',
      analyzed: result.analyzed,
      relevant: result.relevant,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Auto-analysis failed:', error);
    res.status(500).json({
      error: 'Analysis failed',
      details: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Main policy checking function
async function performPolicyCheck(forceScraping = false) {
  try {
    console.log('\n🔍 Starting policy check...');
    console.log('⏰ Time:', new Date().toLocaleString('en-IN'));
    
    const existingPolicies = loadPolicies();
    console.log(`📊 Current stored policies: ${existingPolicies.length}`);
    
    let newPoliciesCount = 0;
    
    // Only scrape if forced or if we have very few policies
    if (forceScraping || existingPolicies.length < 5) {
      console.log('🕷️ Scraping government websites...');
      const scrapedPolicies = await scrapeGovernmentSites();
      
      // Add new policies to storage
      for (const policy of scrapedPolicies) {
        const existingPolicy = existingPolicies.find(p => 
          p.title === policy.title && p.ministry === policy.ministry
        );
        
        if (!existingPolicy) {
          addPolicy(policy);
          newPoliciesCount++;
        }
      }
      
      console.log(`➕ Added ${newPoliciesCount} new policies`);
    } else {
      console.log('⏭️ Skipping scraping - sufficient policies in storage');
    }
    
    // Auto-analyze policies that don't have AI analysis
    const analysisResult = await analyzePendingPolicies();
    
    console.log(`\n📈 Policy Check Summary:`);
    console.log(`   New policies found: ${newPoliciesCount}`);
    console.log(`   Policies analyzed: ${analysisResult.analyzed}`);
    console.log(`   Relevant policies: ${analysisResult.relevant}`);
    console.log('✅ Policy check completed\n');
    
    return {
      newPolicies: newPoliciesCount,
      totalPolicies: loadPolicies().length,
      analyzed: analysisResult.analyzed,
      relevant: analysisResult.relevant
    };
  } catch (error) {
    console.error('❌ Policy check failed:', error);
    throw error;
  }
}

// Analyze policies that don't have AI analysis yet
async function analyzePendingPolicies() {
  const policies = loadPolicies();
  const pendingPolicies = policies.filter(p => !p.aiAnalysis);
  
  console.log(`🧠 Found ${pendingPolicies.length} policies pending analysis`);
  
  let analyzedCount = 0;
  let relevantCount = 0;
  
  for (const policy of pendingPolicies.slice(0, 10)) { // Limit to 10 at a time
    try {
      console.log(`🔍 Analyzing: ${policy.title.substring(0, 50)}...`);
      
      const analysis = await analyzeWithGemini(policy);
      
      // Add drafts placeholder
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
      analyzedCount++;
      
      if (analysis.isAnimalWelfare && analysis.relevanceScore > 50) {
        relevantCount++;
        console.log(`✅ Relevant policy found (${analysis.relevanceScore}% relevance)`);
        
        // Generate drafts for relevant policies
        await generateDraftsForPolicy(policy.id);
        
        // Send email notification for highly relevant policies
        if (analysis.relevanceScore > 70) {
          try {
            const drafts = await generateAllDrafts(policy, analysis);
            await sendEmailNotification({
              policy,
              analysis,
              drafts
            });
            console.log(`📧 Email sent for high-relevance policy`);
          } catch (emailError) {
            console.error(`📧 Email failed:`, emailError.message);
          }
        }
      } else {
        console.log(`⏭️ Policy not relevant (${analysis.relevanceScore}% relevance)`);
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      console.error(`❌ Error analyzing policy "${policy.title.substring(0, 50)}...":`, error.message);
    }
  }
  
  return { analyzed: analyzedCount, relevant: relevantCount };
}

// Generate all draft types for a policy
async function generateAllDrafts(policy, analysis) {
  const drafts = {};
  const tones = ['legal', 'emotional', 'dataBacked'];
  
  for (const tone of tones) {
    try {
      const draft = await generateDraftResponse(policy, analysis, tone);
      drafts[tone] = draft;
    } catch (error) {
      console.error(`Error generating ${tone} draft:`, error.message);
      drafts[tone] = `Draft generation failed: ${error.message}`;
    }
  }
  
  return drafts;
}

// Generate drafts for a specific policy
async function generateDraftsForPolicy(policyId) {
  const policy = loadPolicies().find(p => p.id === policyId);
  if (!policy || !policy.aiAnalysis) return;
  
  const drafts = await generateAllDrafts(policy, policy.aiAnalysis);
  
  // Update policy with generated drafts
  const updatedAnalysis = {
    ...policy.aiAnalysis,
    drafts
  };
  
  updatePolicyAnalysis(policyId, updatedAnalysis);
}

// Generate draft response using Gemini
async function generateDraftResponse(policy, analysis, tone) {
  const prompts = {
    legal: `Generate a formal, legal-focused response to this animal welfare policy consultation:
    
Title: ${policy.title}
Description: ${policy.description}
Ministry: ${policy.ministry}
Deadline: ${policy.deadline}

The response should:
- Use formal legal language
- Reference relevant laws and regulations
- Provide specific legal recommendations
- Be professional and authoritative
- Be 300-500 words

Generate only the response text, no additional formatting.`,

    emotional: `Generate an emotional, compassionate response to this animal welfare policy consultation:
    
Title: ${policy.title}
Description: ${policy.description}
Ministry: ${policy.ministry}
Deadline: ${policy.deadline}

The response should:
- Appeal to compassion and empathy for animals
- Use heartfelt language about animal welfare
- Include compelling emotional arguments
- Be persuasive and moving
- Be 300-500 words

Generate only the response text, no additional formatting.`,

    dataBacked: `Generate a data-driven, evidence-based response to this animal welfare policy consultation:
    
Title: ${policy.title}
Description: ${policy.description}
Ministry: ${policy.ministry}
Deadline: ${policy.deadline}

The response should:
- Include relevant statistics about animal welfare
- Reference scientific studies and research
- Provide economic analysis
- Use evidence-based arguments
- Be 300-500 words

Generate only the response text, no additional formatting.`
  };

  try {
    const response = await analyzeWithGemini({ description: prompts[tone] });
    return response.analysis || `Template ${tone} response for ${policy.title}`;
  } catch (error) {
    return `Draft generation failed: ${error.message}`;
  }
}

// Schedule automatic policy checking (daily at 9 AM IST)
cron.schedule('0 9 * * *', () => {
  console.log('\n⏰ Scheduled daily policy check starting...');
  performPolicyCheck().catch(error => {
    console.error('❌ Scheduled policy check failed:', error);
  });
}, {
  timezone: "Asia/Kolkata"
});

// Auto-analyze pending policies every 2 hours
cron.schedule('0 */2 * * *', () => {
  console.log('\n🧠 Scheduled analysis check starting...');
  analyzePendingPolicies().catch(error => {
    console.error('❌ Scheduled analysis failed:', error);
  });
}, {
  timezone: "Asia/Kolkata"
});

app.listen(PORT, () => {
  console.log('\n🚀 Animal Welfare Policy Monitor Server Started');
  console.log(`📡 Server running on port ${PORT}`);
  console.log('⏰ Scheduled monitoring active');
  console.log('📅 Policy check: Daily at 9 AM IST');
  console.log('🧠 Analysis check: Every 2 hours');
  console.log('🔧 Manual scraping: POST /api/scrape');
  console.log('💡 Health check: GET /api/health\n');
  
  // Auto-analyze pending policies on startup
  setTimeout(() => {
    analyzePendingPolicies().catch(error => {
      console.error('❌ Startup analysis failed:', error);
    });
  }, 5000); // Wait 5 seconds after startup
});