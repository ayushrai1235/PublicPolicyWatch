import { getGeminiDescription } from './server/services/gemini.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const policiesPath = path.join(__dirname, 'server', 'data', 'policies.json');

async function debugGeminiCalls() {
  if (!fs.existsSync(policiesPath)) {
    console.error('policies.json not found');
    return;
  }

  const policies = JSON.parse(fs.readFileSync(policiesPath, 'utf8'));
  
  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];

    if (policy.type === 'pdf') {
      console.log(`\n=== Testing PDF ${i + 1} ===`);
      console.log(`Title: ${policy.title}`);
      console.log(`URL: ${policy.sourceUrl}`);
      console.log(`Current description: ${policy.description.substring(0, 100)}...`);
      
      try {
        console.log('Calling Gemini...');
        const geminiDescription = await getGeminiDescription(policy.sourceUrl);
        
        console.log(`Gemini response: ${geminiDescription}`);
        console.log(`Response length: ${geminiDescription.length}`);
        
        if (geminiDescription && geminiDescription.length > 50) {
          console.log('✅ Valid response received');
        } else {
          console.log('⚠️ Response too short or empty');
        }
      } catch (err) {
        console.error(`❌ Error: ${err.message}`);
      }
      
      console.log('---');
      
      if (i >= 2) {
        console.log('Testing first 3 PDFs only...');
        break;
      }
    }
  }
}

debugGeminiCalls(); 