import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

// Validate API key on startup
if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
  console.warn('⚠️ WARNING: Gemini API key not configured properly!');
  console.warn('Please set GEMINI_API_KEY in your .env file');
  console.warn('Get your API key from: https://makersuite.google.com/app/apikey');
}

const genAI = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key_here' 
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

export async function analyzeWithGemini(policy) {
  // Check if API key is configured
  if (!genAI) {
    console.warn('⚠️ Gemini API not configured, using fallback analysis');
    return generateFallbackAnalysis(policy);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Analyze this government policy consultation for animal welfare relevance:

Title: ${policy.title}
Description: ${policy.description}
Ministry: ${policy.ministry || 'Unknown'}

Please provide a JSON response with the following structure:
{
  "isAnimalWelfare": boolean,
  "relevanceScore": number (0-100),
  "publicSubmissionsOpen": boolean,
  "keyPoints": ["point1", "point2", "point3"],
  "animalWelfareAspects": ["aspect1", "aspect2"],
  "urgencyLevel": "low|medium|high",
  "analysis": "Brief analysis of why this is or isn't relevant to animal welfare"
}

Consider these animal welfare topics:
- Farm animal welfare and livestock conditions
- Wildlife protection and conservation
- Animal testing and research ethics
- Pet and companion animal welfare
- Animal transportation and slaughter
- Veterinary care and animal health
- Animal rights and legal protections
- Zoos, circuses, and entertainment animals
- Animal cruelty prevention
- Biodiversity and habitat protection

Rate relevance from 0-100 where:
- 0-30: Not related to animal welfare
- 31-60: Indirectly related or minor animal welfare implications
- 61-80: Directly related to animal welfare
- 81-100: Primarily focused on animal welfare

Respond only with valid JSON.`;

    console.log('🧠 Sending request to Gemini API...');
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    try {
      // Clean the response to extract JSON
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const analysis = JSON.parse(jsonMatch[0]);
        
        // Validate and sanitize required fields
        const sanitizedAnalysis = {
          isAnimalWelfare: Boolean(analysis.isAnimalWelfare),
          relevanceScore: Math.max(0, Math.min(100, Number(analysis.relevanceScore) || 0)),
          publicSubmissionsOpen: Boolean(analysis.publicSubmissionsOpen !== false),
          keyPoints: Array.isArray(analysis.keyPoints) ? analysis.keyPoints.slice(0, 5) : ['Analysis completed'],
          animalWelfareAspects: Array.isArray(analysis.animalWelfareAspects) ? analysis.animalWelfareAspects.slice(0, 5) : [],
          urgencyLevel: ['low', 'medium', 'high'].includes(analysis.urgencyLevel) ? analysis.urgencyLevel : 'medium',
          analysis: String(analysis.analysis || 'Policy analyzed for animal welfare relevance')
        };
        
        console.log(`✅ Gemini analysis complete: ${sanitizedAnalysis.relevanceScore}% relevance, Animal welfare: ${sanitizedAnalysis.isAnimalWelfare}`);
        return sanitizedAnalysis;
      }
    } catch (parseError) {
      console.error('❌ Error parsing Gemini JSON response:', parseError.message);
      console.log('Raw response:', text.substring(0, 200) + '...');
    }
    
    // Fallback if JSON parsing fails
    return generateFallbackAnalysis(policy, 'Gemini API response parsing failed');
    
  } catch (error) {
    console.error('❌ Gemini API error:', error.message);
    
    if (error.message.includes('API key not valid')) {
      console.error('🔑 Invalid API key! Please check your GEMINI_API_KEY in .env file');
      console.error('Get your API key from: https://makersuite.google.com/app/apikey');
    } else if (error.message.includes('quota')) {
      console.error('📊 API quota exceeded. Check your Gemini API usage limits');
    } else if (error.message.includes('blocked')) {
      console.error('🚫 Request blocked by safety filters');
    }
    
    return generateFallbackAnalysis(policy, `Gemini API error: ${error.message}`);
  }
}

function generateFallbackAnalysis(policy, reason = 'API not configured') {
  const text = (policy.title + ' ' + policy.description).toLowerCase();
  
  // Enhanced keyword-based analysis
  const animalWelfareKeywords = {
    high: ['animal welfare', 'animal rights', 'animal cruelty', 'animal protection', 'wildlife protection'],
    medium: ['livestock', 'veterinary', 'zoo', 'circus', 'pet', 'companion animal', 'farm animal'],
    low: ['animal', 'wildlife', 'conservation', 'biodiversity', 'environment', 'agriculture']
  };
  
  let relevanceScore = 0;
  let isAnimalWelfare = false;
  let aspects = [];
  
  // Check for high-relevance keywords
  for (const keyword of animalWelfareKeywords.high) {
    if (text.includes(keyword)) {
      relevanceScore += 25;
      isAnimalWelfare = true;
      aspects.push(`Contains "${keyword}" - high relevance`);
    }
  }
  
  // Check for medium-relevance keywords
  for (const keyword of animalWelfareKeywords.medium) {
    if (text.includes(keyword)) {
      relevanceScore += 15;
      isAnimalWelfare = true;
      aspects.push(`Contains "${keyword}" - medium relevance`);
    }
  }
  
  // Check for low-relevance keywords
  for (const keyword of animalWelfareKeywords.low) {
    if (text.includes(keyword) && relevanceScore < 30) {
      relevanceScore += 10;
      aspects.push(`Contains "${keyword}" - low relevance`);
    }
  }
  
  relevanceScore = Math.min(relevanceScore, 100);
  isAnimalWelfare = relevanceScore > 30;
  
  const analysis = {
    isAnimalWelfare,
    relevanceScore,
    publicSubmissionsOpen: true,
    keyPoints: [
      'Keyword-based analysis performed',
      `Relevance score: ${relevanceScore}%`,
      reason
    ],
    animalWelfareAspects: aspects.length > 0 ? aspects : ['No specific animal welfare aspects detected'],
    urgencyLevel: relevanceScore > 70 ? 'high' : relevanceScore > 40 ? 'medium' : 'low',
    analysis: `Fallback analysis: ${reason}. Keyword-based relevance score: ${relevanceScore}%. ${isAnimalWelfare ? 'Appears to be animal welfare related.' : 'Does not appear to be directly animal welfare related.'}`
  };
  
  console.log(`🔄 Fallback analysis complete: ${relevanceScore}% relevance, Animal welfare: ${isAnimalWelfare}`);
  return analysis;
}

export async function generateDraftResponse(policy, tone) {
  if (!genAI) {
    console.warn('⚠️ Gemini API not configured, using template response');
    return generateTemplateResponse(policy, tone);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const tonePrompts = {
      legal: `Generate a formal, legal-focused response to this animal welfare policy consultation. Use professional legal language, reference relevant laws and regulations, and provide specific legal recommendations. The response should be authoritative and well-structured.`,
      
      emotional: `Generate an emotional, compassionate response to this animal welfare policy consultation. Appeal to empathy and compassion, use heartfelt language about animal suffering, and include persuasive emotional arguments. The response should be moving and compelling.`,
      
      dataBacked: `Generate a data-driven, evidence-based response to this animal welfare policy consultation. Include statistics, research findings, scientific studies, and economic analysis. Use evidence-based arguments and factual information to support recommendations.`
    };
    
    const prompt = `${tonePrompts[tone]}

Policy Details:
Title: ${policy.title}
Description: ${policy.description}
Ministry: ${policy.ministry}
Deadline: ${policy.deadline}

Requirements:
- 300-500 words
- Professional format suitable for government submission
- Include specific recommendations
- Address the policy's impact on animal welfare
- Provide actionable suggestions

Generate only the response text, no additional formatting or explanations.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
    
  } catch (error) {
    console.error(`❌ Error generating ${tone} draft:`, error.message);
    return generateTemplateResponse(policy, tone);
  }
}

function generateTemplateResponse(policy, tone) {
  const templates = {
    legal: `Subject: Response to ${policy.title}

Dear Sir/Madam,

I am writing to provide comments on the above-mentioned policy consultation. As a concerned citizen, I believe this policy has significant implications for animal welfare in India.

Legal Recommendations:
1. Ensure compliance with the Prevention of Cruelty to Animals Act, 1960
2. Align with Wildlife Protection Act, 1972 provisions
3. Include mandatory welfare standards and enforcement mechanisms
4. Establish clear penalties for non-compliance

I urge the ministry to consider these legal aspects to strengthen animal protection in our country.

Thank you for the opportunity to comment.

Sincerely,
[Your Name]`,

    emotional: `Subject: Heartfelt Response to ${policy.title}

Dear Policy Makers,

I am deeply moved to respond to this important consultation that affects the lives of countless animals in our country.

Every animal deserves compassion, care, and protection from suffering. This policy represents an opportunity to show our humanity and moral responsibility toward the voiceless creatures who share our world.

I implore you to:
- Consider the emotional capacity of animals to feel pain and fear
- Implement measures that prioritize animal welfare above economic interests
- Remember that a society is judged by how it treats its most vulnerable members

Please let compassion guide your decisions.

With hope and respect,
[Your Name]`,

    dataBacked: `Subject: Evidence-Based Response to ${policy.title}

Dear Committee Members,

I submit this data-driven response to support evidence-based policy making.

Key Statistics:
- India has over 300 million livestock animals requiring welfare protection
- Studies show improved animal welfare increases productivity by 15-20%
- Economic benefits of welfare standards outweigh implementation costs

Research Findings:
- Scientific evidence demonstrates animals' capacity for suffering
- International best practices show welfare standards improve outcomes
- Data indicates public support for stronger animal protection measures

I recommend implementing evidence-based welfare standards supported by scientific research.

Respectfully submitted,
[Your Name]`
  };

  return templates[tone] || templates.legal;
}

export async function getGeminiDescription(pdfUrl) {
  if (!genAI) {
    console.warn('⚠️ Gemini API not configured, using fallback description');
    return generateFallbackDescription(pdfUrl);
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const prompt = `Analyze this PDF URL and provide a brief description of what the document is about:

PDF URL: ${pdfUrl}

Please provide a concise description (100-200 words) that explains:
1. What type of document this is (circular, notification, policy, etc.)
2. The main topic or subject matter
3. Any key points or important information
4. Whether it's related to animal welfare, government policy, or other relevant topics

Focus on being informative and accurate. If you cannot access the PDF content directly, provide a description based on the URL and any available context.

Respond with just the description, no additional formatting.`;

    console.log('🧠 Sending PDF description request to Gemini API...');
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const description = response.text().trim();
    
    if (description && description.length > 20) {
      console.log(`✅ Gemini description generated: ${description.length} characters`);
      return description;
    } else {
      console.warn('⚠️ Gemini returned empty or too short description');
      return generateFallbackDescription(pdfUrl);
    }
    
  } catch (error) {
    console.error('❌ Gemini API error for PDF description:', error.message);
    
    if (error.message.includes('API key not valid')) {
      console.error('🔑 Invalid API key! Please check your GEMINI_API_KEY in .env file');
    } else if (error.message.includes('quota')) {
      console.error('📊 API quota exceeded. Check your Gemini API usage limits');
    } else if (error.message.includes('blocked')) {
      console.error('🚫 Request blocked by safety filters');
    }
    
    return generateFallbackDescription(pdfUrl, `Gemini API error: ${error.message}`);
  }
}

function generateFallbackDescription(pdfUrl, reason = 'API not configured') {
  const urlLower = pdfUrl.toLowerCase();
  let description = 'Government document';
  
  if (urlLower.includes('awbi.gov.in')) {
    description = 'Animal Welfare Board of India document';
  } else if (urlLower.includes('aqcsindia.gov.in')) {
    description = 'Aquaculture Certification Scheme India document';
  } else if (urlLower.includes('moef.gov.in')) {
    description = 'Ministry of Environment document';
  } else if (urlLower.includes('prsindia.org')) {
    description = 'PRS India legislative document';
  }
  
  if (urlLower.includes('circular')) {
    description += ' - Circular';
  } else if (urlLower.includes('notification')) {
    description += ' - Notification';
  } else if (urlLower.includes('policy')) {
    description += ' - Policy document';
  }
  
  if (urlLower.includes('animal') || urlLower.includes('welfare') || urlLower.includes('livestock')) {
    description += ' related to animal welfare';
  }
  
  description += '. Please refer to the original PDF for complete details.';
  
  console.log(`🔄 Fallback description generated: ${description}`);
  return description;
}