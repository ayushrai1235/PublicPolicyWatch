import { processPDFPolicy } from './server/services/pdfExtractor.js';
import { getGeminiDescription } from './server/services/gemini.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const policiesPath = path.join(__dirname, 'server', 'data', 'policies.json');

async function updateAllPDFDescriptions() {
  if (!fs.existsSync(policiesPath)) {
    console.error('policies.json not found');
    return;
  }

  const policies = JSON.parse(fs.readFileSync(policiesPath, 'utf8'));
  let updatedCount = 0;

  for (let i = 0; i < policies.length; i++) {
    const policy = policies[i];

    if (policy.type === 'pdf') {
      console.log(`Processing PDF policy ${i + 1}: ${policy.title}`);
      console.log(`URL: ${policy.sourceUrl}`);
      
      try {
        const geminiDescription = await getGeminiDescription(policy.sourceUrl);
        
        if (geminiDescription && geminiDescription.length > 50) {
          policy.description = geminiDescription;
          policy.extractedText = geminiDescription;
          updatedCount++;
          console.log(`✅ Updated: ${policy.title}`);
          console.log(`New description: ${geminiDescription.substring(0, 100)}...`);
        } else {
          console.log(`⚠️ Skipped: ${policy.title} - No valid description generated`);
        }
      } catch (err) {
        console.warn(`❌ Failed to update policy ${policy.title}: ${err.message}`);
      }
      
      console.log('---');
    }
  }

  fs.writeFileSync(policiesPath, JSON.stringify(policies, null, 2));
  console.log(`\n✅ Updated ${updatedCount} PDF policies with unique Gemini-generated descriptions.`);
}

updateAllPDFDescriptions(); 