import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGeminiDescription } from './gemini.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const tempDir = path.join(__dirname, '../temp');

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

export async function extractTextFromPDF(pdfUrl) {
  return {
    text: '',
    pages: 1,
    info: { title: 'Government Document' }
  };
}

export async function processPDFPolicy(pdfUrl, sourcePageUrl) {
  try {
    console.log(` Processing PDF policy (Gemini only): ${pdfUrl}`);
    
    const urlBasedPolicy = createPolicyFromURL(pdfUrl, sourcePageUrl);

    try {
      const geminiDescription = await getGeminiDescription(pdfUrl);
      
      return {
        ...urlBasedPolicy,
        description: geminiDescription || urlBasedPolicy.description,
        extractedText: geminiDescription || urlBasedPolicy.description
      };
    } catch (geminiError) {
      console.warn(` Gemini extraction failed, using URL-based policy: ${geminiError.message}`);
      
      return {
        ...urlBasedPolicy,
        description: 'Description could not be extracted. Please refer to the original PDF.',
        extractedText: 'Description could not be extracted. Please refer to the original PDF.'
      };
    }
  } catch (error) {
    console.error(` Failed to process PDF policy ${pdfUrl}:`, error.message);
    return null;
  }
}

function createPolicyFromURL(pdfUrl, sourcePageUrl) {
  const fileName = path.basename(pdfUrl, '.pdf');
  const urlParts = pdfUrl.split('/');
  
  let title = fileName
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, l => l.toUpperCase())
    .trim();
  
  if (title.length < 10) {
    title = 'Government Circular/Notification';
  }
  
  let ministry = 'Unknown Ministry';
  
  if (pdfUrl.includes('awbi.gov.in')) {
    ministry = 'Animal Welfare Board of India';
  } else if (pdfUrl.includes('aqcsindia.gov.in')) {
    ministry = 'Aquaculture Certification Scheme India';
  } else if (pdfUrl.includes('moef.gov.in')) {
    ministry = 'Ministry of Environment';
  }
  
  const urlLower = pdfUrl.toLowerCase();
  const animalWelfareKeywords = ['animal', 'welfare', 'livestock', 'veterinary', 'wildlife', 'aquaculture'];
  const isAnimalWelfareRelated = animalWelfareKeywords.some(keyword => urlLower.includes(keyword));
  
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 30);
  const deadline = defaultDate.toISOString().split('T')[0];
  
  return {
    id: `pdf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    title: title,
    description: `Government document from ${ministry}. This PDF may contain images, scanned content, or be in a format that doesn't support text extraction. Please refer to the original PDF for complete details.`,
    ministry: ministry,
    deadline: deadline,
    sourceUrl: pdfUrl,
    sourcePageUrl: sourcePageUrl,
    discoveredAt: new Date().toISOString(),
    status: 'active',
    type: 'pdf',
    pages: 1,
    extractedText: 'PDF content extraction pending. Please refer to original document.',
    isAnimalWelfareRelated: isAnimalWelfareRelated,
    relevantKeywords: isAnimalWelfareRelated ? ['animal', 'welfare'] : []
  };
}