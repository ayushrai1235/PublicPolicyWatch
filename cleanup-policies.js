import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function isGarbledText(text) {
  if (!text) return false;
  
  const garbledPatterns = [
    /\u0000/,
    /\u0011/,
    /\u001f/,
    /\u001b/,
    /\u0019/,
    /\u0018/,
    /\u0017/,
    /\u0016/,
    /\u0015/,
    /\u0014/,
    /\u0013/,
    /\u0012/,
    /\u0010/,
    /\u000f/,
    /\u000e/,
    /\u000d/,
    /\u000c/,
    /\u000b/,
    /\u000a/,
    /\u0009/,
    /\u0008/,
    /\u0007/,
    /\u0006/,
    /\u0005/,
    /\u0004/,
    /\u0003/,
    /\u0002/,
    /\u0001/,
    /\u0000/,
    /ÿ/,
    /[^\x00-\x7F]/,
    /\u0011/,
    /\u0012/,
    /\u0013/,
    /\u0014/,
    /\u0015/,
    /\u0016/,
    /\u0017/,
    /\u0018/,
    /\u0019/,
    /\u001a/,
    /\u001b/,
    /\u001c/,
    /\u001d/,
    /\u001e/,
    /\u001f/,
  ];
  
  let garbledCount = 0;
  
  for (const pattern of garbledPatterns) {
    if (pattern.test(text)) {
      garbledCount++;
    }
  }
  
  const garbledRatio = garbledCount / text.length;
  return garbledRatio > 0.05 || text.includes('ÿ') || text.includes('') || text.includes('ë');
}

function generateCleanDescription(policy) {
  const urlLower = policy.sourceUrl.toLowerCase();
  const titleLower = policy.title.toLowerCase();
  let description = '';
  
  if (urlLower.includes('awbi.gov.in')) {
    description = 'Animal Welfare Board of India document';
  } else if (urlLower.includes('aqcsindia.gov.in')) {
    description = 'Aquaculture Certification Scheme India document';
  } else if (urlLower.includes('moef.gov.in')) {
    description = 'Ministry of Environment document';
  } else if (urlLower.includes('prsindia.org')) {
    description = 'PRS India legislative document';
  } else {
    description = 'Government document';
  }
  
  if (titleLower.includes('animal husbandry') && titleLower.includes('animal welfare awareness month')) {
    description = 'Animal Welfare Board of India circular regarding the observance of "Animal Husbandry and Animal Welfare Awareness Month". This initiative focuses on promoting awareness about animal welfare practices, livestock care standards, and humane treatment of animals. The document likely outlines activities, guidelines, and objectives for the awareness month campaign.';
  } else if (titleLower.includes('find your mp')) {
    description = 'PRS India tool for locating and connecting with Members of Parliament (MPs) and Members of Legislative Assemblies (MLAs). This service provides information about parliamentary representatives, their constituencies, contact details, and legislative activities. Users can search by location or representative name to find their elected officials.';
  } else if (titleLower.includes('2024 elections')) {
    description = 'PRS India information portal about the 2024 elections for Members of Parliament and Members of Legislative Assemblies. This resource provides details about electoral processes, candidate information, constituency data, and election-related legislative updates. Includes information about both parliamentary and state legislature elections.';
  } else if (titleLower.includes('sanitary import permits') || titleLower.includes('sips')) {
    description = 'Aquaculture Certification Scheme India notification regarding revision of user charges for processing applications for Sanitary Import Permits (SIPs). This policy affects the import of aquatic animals and related products, ensuring health standards and preventing disease transmission. The revision may impact import costs and procedures for aquaculture businesses.';
  } else if (titleLower.includes('accommodation charges') && titleLower.includes('quarantine')) {
    description = 'Aquaculture Certification Scheme India administrative approval for collection of processing fees for import/export applications and enhancement of accommodation charges for animals at Animal Quarantine & Certification Services stations. This policy affects the costs and conditions for importing/exporting animals, particularly aquatic species, and their quarantine procedures.';
  } else if (titleLower.includes('consultant') && titleLower.includes('aqcs')) {
    description = 'Aquaculture Certification Scheme India circular regarding extension of application deadline for hiring a consultant on contract basis in AQCS (Southern Region), Chennai. This position likely involves providing expertise in aquaculture certification, animal health standards, or import/export regulations for aquatic animals.';
  } else if (titleLower.includes('circular')) {
    description += ' - Circular';
  } else if (titleLower.includes('notification')) {
    description += ' - Notification';
  } else if (titleLower.includes('policy')) {
    description += ' - Policy document';
  }
  
  if (titleLower.includes('animal') || titleLower.includes('welfare') || titleLower.includes('livestock')) {
    if (!description.includes('animal welfare')) {
      description += ' related to animal welfare';
    }
  } else if (titleLower.includes('election') || titleLower.includes('mp') || titleLower.includes('parliament')) {
    if (!description.includes('parliamentary')) {
      description += ' related to parliamentary processes';
    }
  } else if (titleLower.includes('import') || titleLower.includes('export') || titleLower.includes('permit')) {
    if (!description.includes('import/export')) {
      description += ' related to import/export regulations';
    }
  }
  
  if (policy.deadline) {
    description += ` The consultation deadline is ${policy.deadline}.`;
  }
  
  description += ' Please refer to the original document for complete details.';
  return description;
}

async function cleanupPolicies() {
  try {
    const policiesPath = path.join(__dirname, 'server', 'data', 'policies.json');
    
    if (!fs.existsSync(policiesPath)) {
      console.error('❌ policies.json not found');
      return;
    }
    
    console.log('📖 Reading policies.json...');
    const policies = JSON.parse(fs.readFileSync(policiesPath, 'utf8'));
    
    let cleanedCount = 0;
    let totalPolicies = policies.length;
    
    console.log(`🔍 Found ${totalPolicies} policies to check...`);
    
    for (let i = 0; i < policies.length; i++) {
      const policy = policies[i];
      let needsUpdate = false;
      
      if (isGarbledText(policy.description)) {
        console.log(`🧹 Cleaning garbled description for policy ${i + 1}: ${policy.title}`);
        policy.description = generateCleanDescription(policy);
        needsUpdate = true;
      }
      
      if (policy.extractedText && isGarbledText(policy.extractedText)) {
        console.log(`🧹 Cleaning garbled extractedText for policy ${i + 1}: ${policy.title}`);
        policy.extractedText = generateCleanDescription(policy);
        needsUpdate = true;
      }
      
      if (needsUpdate) {
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      fs.writeFileSync(policiesPath, JSON.stringify(policies, null, 2));
      console.log(`✅ Cleaned ${cleanedCount} out of ${totalPolicies} policies`);
      console.log('📝 Updated policies.json with clean descriptions');
    } else {
      console.log('✨ No garbled text found - all policies are clean!');
    }
    
  } catch (error) {
    console.error('❌ Error cleaning policies:', error.message);
  }
}

cleanupPolicies(); 