import axios from 'axios';
import * as cheerio from 'cheerio';
import { processPDFPolicy } from './pdfExtractor.js';

// Updated government websites with PDF-enabled sites
const GOVERNMENT_SITES = [
  {
    name: 'Animal Welfare Board of India',
    url: 'https://awbi.gov.in',
    consultationPath: '/circulars',
    type: 'pdf',
    selectors: {
      container: ['.circular-item', '.document-item', '.post', 'article', 'tr', '.row'],
      title: ['.title', 'h3', 'h4', 'td', '.document-title'],
      pdfLink: ['a[href$=".pdf"]', 'a[href*=".pdf"]', '.pdf-link', '.download-link'],
      date: ['.date', '.published', 'td']
    }
  },
  {
    name: 'Aquaculture Certification Scheme India',
    url: 'https://aqcsindia.gov.in',
    consultationPath: '/Home/Notification',
    type: 'pdf',
    selectors: {
      container: ['.notification-item', '.document-item', '.post', 'article', 'tr', '.row'],
      title: ['.title', 'h3', 'h4', 'td', '.document-title'],
      pdfLink: ['a[href$=".pdf"]', 'a[href*=".pdf"]', '.pdf-link', '.download-link'],
      date: ['.date', '.published', 'td']
    }
  },

];

export async function scrapeGovernmentSites() {
  console.log('🕷️ Starting comprehensive government website scraping...');
  const allPolicies = [];
  
  for (const site of GOVERNMENT_SITES) {
    try {
      console.log(`\n📡 Scraping ${site.name}...`);
      
      let policies = [];
      
      if (site.type === 'pdf') {
        policies = await scrapePDFSite(site);
      } else {
        policies = await scrapeSiteWithFallbacks(site);
      }
      
      if (policies.length > 0) {
        allPolicies.push(...policies);
        console.log(`✅ Found ${policies.length} policies from ${site.name}`);
      } else {
        console.log(`⚠️ No policies found from ${site.name}`);
        // Add mock data for demonstration when real scraping fails
        const mockPolicies = generateMockPolicies(site.name);
        allPolicies.push(...mockPolicies);
        console.log(`📝 Added ${mockPolicies.length} mock policies for ${site.name}`);
      }
    } catch (error) {
      console.error(`❌ Error scraping ${site.name}:`, error.message);
      // Add mock data as fallback
      const mockPolicies = generateMockPolicies(site.name);
      allPolicies.push(...mockPolicies);
      console.log(`🔄 Added fallback mock data for ${site.name}`);
    }
  }
  
  console.log(`\n🎯 Total policies collected: ${allPolicies.length}`);
  return allPolicies;
}

async function scrapePDFSite(site) {
  console.log(`📄 Scraping PDF site: ${site.name}`);
  const policies = [];
  
  const urls = [
    site.url + site.consultationPath,
    site.url + '/circulars/',
    site.url + '/notifications/',
    site.url + '/documents/',
    site.url
  ];

  for (const url of urls) {
    try {
      console.log(`  🔍 Trying PDF URL: ${url}`);
      const siteData = await fetchWithRetry(url);
      
      if (siteData) {
        const $ = cheerio.load(siteData);
        const pdfPolicies = await extractPDFPoliciesFromPage($, site, url);
        
        if (pdfPolicies.length > 0) {
          policies.push(...pdfPolicies);
          console.log(`  ✅ Successfully extracted ${pdfPolicies.length} PDF policies from ${url}`);
          break; // Stop trying other URLs if we found policies
        }
      }
    } catch (error) {
      console.log(`  ⚠️ Failed to scrape PDF site ${url}: ${error.message}`);
      continue;
    }
  }

  return policies;
}

async function extractPDFPoliciesFromPage($, site, sourceUrl) {
  const policies = [];
  
  // Find PDF links
  const pdfLinks = [];
  
  // Try different selectors for PDF links
  for (const containerSelector of site.selectors.container) {
    const containers = $(containerSelector);
    
    containers.each((index, element) => {
      const $element = $(element);
      
      // Look for PDF links within this container
      for (const pdfSelector of site.selectors.pdfLink) {
        const links = $element.find(pdfSelector);
        
        links.each((i, link) => {
          const href = $(link).attr('href');
          if (href && href.toLowerCase().includes('.pdf')) {
            let fullUrl = href;
            
            // Convert relative URLs to absolute
            if (href.startsWith('/')) {
              fullUrl = site.url + href;
            } else if (!href.startsWith('http')) {
              fullUrl = site.url + '/' + href;
            }
            
            // Extract title from link text or parent element
            let title = $(link).text().trim();
            if (!title || title.length < 10) {
              title = $element.find(site.selectors.title.join(', ')).first().text().trim();
            }
            if (!title || title.length < 10) {
              title = $element.text().trim().split('\n')[0];
            }
            
            // Extract date if available
            let date = null;
            for (const dateSelector of site.selectors.date || ['.date']) {
              const dateText = $element.find(dateSelector).text().trim();
              if (dateText) {
                date = dateText;
                break;
              }
            }
            
            pdfLinks.push({
              url: fullUrl,
              title: title || 'Government Document',
              date: date,
              sourcePageUrl: sourceUrl
            });
          }
        });
      }
    });
    
    if (pdfLinks.length > 0) break; // Stop if we found PDF links
  }
  
  // If no specific PDF links found, look for any PDF links on the page
  if (pdfLinks.length === 0) {
    $('a[href*=".pdf"]').each((index, link) => {
      const href = $(link).attr('href');
      if (href) {
        let fullUrl = href;
        
        if (href.startsWith('/')) {
          fullUrl = site.url + href;
        } else if (!href.startsWith('http')) {
          fullUrl = site.url + '/' + href;
        }
        
        const title = $(link).text().trim() || $(link).closest('tr, .row, .item').text().trim().split('\n')[0];
        
        pdfLinks.push({
          url: fullUrl,
          title: title || 'Government Document',
          date: null,
          sourcePageUrl: sourceUrl
        });
      }
    });
  }
  
  console.log(`  📄 Found ${pdfLinks.length} PDF links`);
  
  // Process each PDF (limit to 5 to avoid overwhelming the system)
  for (const pdfLink of pdfLinks.slice(0, 5)) {
    try {
      console.log(`  🔍 Processing PDF: ${pdfLink.title.substring(0, 50)}...`);
      
      const policy = await processPDFPolicy(pdfLink.url, pdfLink.sourcePageUrl);
      
      if (policy) {
        // Override title if we have a better one from the page
        if (pdfLink.title && pdfLink.title.length > 10) {
          policy.title = pdfLink.title;
        }
        
        // Add ministry info
        policy.ministry = site.name;
        
        policies.push(policy);
        console.log(`  ✅ Successfully processed PDF policy: ${policy.title.substring(0, 50)}...`);
      }
      
      // Add delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 2000));
      
    } catch (error) {
      console.error(`  ❌ Error processing PDF ${pdfLink.url}:`, error.message);
    }
  }
  
  return policies;
}

async function scrapeSiteWithFallbacks(site) {
  const policies = [];
  const urls = [
    site.url + site.consultationPath,
    site.url + '/consultations/',
    site.url + '/public-consultations/',
    site.url + '/notifications/',
    site.url + '/policies/',
    site.url
  ];

  for (const url of urls) {
    try {
      console.log(`  🔍 Trying URL: ${url}`);
      const siteData = await fetchWithRetry(url);
      
      if (siteData) {
        const $ = cheerio.load(siteData);
        const extractedPolicies = extractPoliciesFromPage($, site, url);
        
        if (extractedPolicies.length > 0) {
          policies.push(...extractedPolicies);
          console.log(`  ✅ Successfully extracted ${extractedPolicies.length} policies from ${url}`);
          break; // Stop trying other URLs if we found policies
        }
      }
    } catch (error) {
      console.log(`  ⚠️ Failed to scrape ${url}: ${error.message}`);
      continue;
    }
  }

  return policies;
}

async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`    📥 Attempt ${attempt}/${maxRetries} for ${url}`);
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
          'Sec-Fetch-Dest': 'document',
          'Sec-Fetch-Mode': 'navigate',
          'Sec-Fetch-Site': 'none',
          'Cache-Control': 'max-age=0'
        },
        maxRedirects: 5,
        validateStatus: (status) => status < 400
      });

      if (response.data && response.data.length > 1000) {
        console.log(`    ✅ Successfully fetched ${response.data.length} characters`);
        return response.data;
      } else {
        throw new Error('Response too small or empty');
      }
    } catch (error) {
      console.log(`    ❌ Attempt ${attempt} failed: ${error.message}`);
      
      if (attempt === maxRetries) {
        if (error.code === 'ENOTFOUND') {
          throw new Error(`DNS resolution failed for ${url}`);
        } else if (error.code === 'ECONNREFUSED') {
          throw new Error(`Connection refused by ${url}`);
        } else if (error.code === 'ETIMEDOUT') {
          throw new Error(`Request timeout for ${url}`);
        } else if (error.response?.status === 403) {
          throw new Error(`Access forbidden (403) for ${url}`);
        } else if (error.response?.status === 404) {
          throw new Error(`Page not found (404) for ${url}`);
        } else {
          throw new Error(`Failed to fetch ${url}: ${error.message}`);
        }
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
    }
  }
}

function extractPoliciesFromPage($, site, sourceUrl) {
  const policies = [];
  
  // Try multiple container selectors
  for (const containerSelector of site.selectors.container) {
    const containers = $(containerSelector);
    
    if (containers.length > 0) {
      console.log(`    🎯 Found ${containers.length} potential containers with selector: ${containerSelector}`);
      
      containers.each((index, element) => {
        try {
          const policy = extractPolicyFromElement($, $(element), site, sourceUrl, index);
          if (policy && isValidPolicy(policy)) {
            policies.push(policy);
          }
        } catch (error) {
          console.log(`    ⚠️ Error extracting policy from element ${index}: ${error.message}`);
        }
      });
      
      if (policies.length > 0) {
        break; // Stop trying other selectors if we found policies
      }
    }
  }
  
  // If no policies found with specific selectors, try generic extraction
  if (policies.length === 0) {
    console.log(`    🔄 No policies found with specific selectors, trying generic extraction...`);
    return genericPolicyExtraction($, site, sourceUrl);
  }
  
  return policies.slice(0, 10); // Limit to 10 policies per site
}

function extractPolicyFromElement($, element, site, sourceUrl, index) {
  let title = '';
  let description = '';
  let deadline = '';
  
  // Extract title using multiple selectors
  for (const titleSelector of site.selectors.title) {
    const titleElement = element.find(titleSelector).first();
    if (titleElement.length > 0) {
      title = titleElement.text().trim();
      if (title.length > 10) break;
    }
  }
  
  // Extract description
  for (const descSelector of site.selectors.description) {
    const descElement = element.find(descSelector).first();
    if (descElement.length > 0) {
      description = descElement.text().trim();
      if (description.length > 20) break;
    }
  }
  
  // Extract deadline
  for (const deadlineSelector of site.selectors.deadline) {
    const deadlineElement = element.find(deadlineSelector).first();
    if (deadlineElement.length > 0) {
      deadline = extractDeadline(deadlineElement.text().trim());
      if (deadline) break;
    }
  }
  
  // If no title found, try getting it from the element text
  if (!title || title.length < 10) {
    const elementText = element.text().trim();
    const lines = elementText.split('\n').filter(line => line.trim().length > 10);
    if (lines.length > 0) {
      title = lines[0].trim().substring(0, 200);
    }
  }
  
  // If no description, use element text
  if (!description || description.length < 20) {
    const elementText = element.text().trim();
    description = elementText.substring(0, 300) + (elementText.length > 300 ? '...' : '');
  }
  
  // Set default deadline if none found
  if (!deadline) {
    deadline = getDefaultDeadline();
  }
  
  return {
    id: `${site.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`,
    title: title || 'Policy Consultation',
    description: description || 'Government policy consultation opportunity',
    ministry: site.name,
    deadline: deadline,
    sourceUrl: sourceUrl,
    discoveredAt: new Date().toISOString(),
    status: 'active',
    type: 'html'
  };
}

function genericPolicyExtraction($, site, sourceUrl) {
  const policies = [];
  const policyKeywords = [
    'consultation', 'policy', 'draft', 'amendment', 'regulation',
    'guidelines', 'framework', 'act', 'bill', 'notification',
    'animal', 'welfare', 'wildlife', 'environment', 'agriculture',
    'livestock', 'veterinary', 'conservation', 'biodiversity'
  ];
  
  // Look for text containing policy keywords
  $('p, div, article, section').each((index, element) => {
    const text = $(element).text().trim();
    
    if (text.length > 50 && text.length < 1000) {
      const lowerText = text.toLowerCase();
      const keywordMatches = policyKeywords.filter(keyword => lowerText.includes(keyword));
      
      if (keywordMatches.length >= 2) {
        const lines = text.split('\n').filter(line => line.trim().length > 10);
        const title = lines[0] ? lines[0].trim().substring(0, 200) : 'Policy Consultation';
        
        policies.push({
          id: `${site.name.toLowerCase().replace(/\s+/g, '-')}-generic-${Date.now()}-${index}`,
          title: title,
          description: text.substring(0, 300) + (text.length > 300 ? '...' : ''),
          ministry: site.name,
          deadline: getDefaultDeadline(),
          sourceUrl: sourceUrl,
          discoveredAt: new Date().toISOString(),
          status: 'active',
          type: 'html'
        });
      }
    }
    
    if (policies.length >= 5) return false; // Stop after finding 5 policies
  });
  
  return policies;
}

function isValidPolicy(policy) {
  return (
    policy.title && 
    policy.title.length > 10 && 
    policy.title.length < 500 &&
    policy.description && 
    policy.description.length > 20 &&
    policy.deadline &&
    new Date(policy.deadline) > new Date()
  );
}

function extractDeadline(deadlineText) {
  if (!deadlineText) return null;
  
  // Enhanced date patterns for Indian government websites
  const datePatterns = [
    // DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY
    /(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})/,
    // YYYY/MM/DD, YYYY-MM-DD
    /(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/,
    // DD Month YYYY
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{4})/i,
    // Month DD, YYYY
    /(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{1,2}),?\s+(\d{4})/i,
    // ISO format
    /(\d{4})-(\d{2})-(\d{2})/
  ];
  
  for (const pattern of datePatterns) {
    const match = deadlineText.match(pattern);
    if (match) {
      try {
        let date;
        
        if (pattern.source.includes('Jan|Feb')) {
          // Handle month name formats
          if (match[1].length === 4) {
            // YYYY Month DD
            date = new Date(`${match[2]} ${match[3]}, ${match[1]}`);
          } else {
            // DD Month YYYY or Month DD, YYYY
            date = new Date(`${match[2]} ${match[1]}, ${match[3]}`);
          }
        } else if (match[1].length === 4) {
          // YYYY-MM-DD format
          date = new Date(`${match[1]}-${match[2].padStart(2, '0')}-${match[3].padStart(2, '0')}`);
        } else {
          // DD/MM/YYYY format (Indian standard)
          date = new Date(`${match[3]}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`);
        }
        
        if (!isNaN(date.getTime()) && date > new Date()) {
          return date.toISOString().split('T')[0];
        }
      } catch (error) {
        console.log(`    ⚠️ Error parsing date "${deadlineText}": ${error.message}`);
      }
    }
  }
  
  return null;
}

function getDefaultDeadline() {
  // Default to 30 days from now
  const date = new Date();
  date.setDate(date.getDate() + 30);
  return date.toISOString().split('T')[0];
}

// Enhanced mock data generator for when real scraping fails
function generateMockPolicies(ministry) {
  const mockPolicies = [
    {
      title: 'Draft Guidelines for Animal Welfare in Research Institutions 2024',
      description: 'Comprehensive guidelines for ensuring animal welfare in scientific research and testing facilities. The guidelines cover housing standards, veterinary care, ethical review processes, and alternatives to animal testing.',
      keywords: ['animal welfare', 'research', 'guidelines', 'ethics']
    },
    {
      title: 'Amendment to Wildlife Protection Act - Enhanced Conservation Measures',
      description: 'Proposed amendments to strengthen wildlife protection laws and conservation measures. Includes provisions for habitat protection, anti-poaching measures, and community-based conservation programs.',
      keywords: ['wildlife', 'protection', 'conservation', 'habitat']
    },
    {
      title: 'National Policy on Livestock Transportation and Welfare Standards',
      description: 'New comprehensive policy for the humane transportation of livestock across state boundaries. Covers vehicle specifications, journey duration limits, rest stops, and veterinary oversight.',
      keywords: ['livestock', 'transportation', 'welfare', 'standards']
    },
    {
      title: 'Draft Rules for Prevention of Cruelty to Animals (Amendment) 2024',
      description: 'Proposed amendments to strengthen animal cruelty prevention laws with enhanced penalties, better enforcement mechanisms, and expanded scope of protection.',
      keywords: ['animal cruelty', 'prevention', 'laws', 'enforcement']
    },
    {
      title: 'Guidelines for Ethical Treatment of Animals in Entertainment Industry',
      description: 'New guidelines for the use of animals in films, circuses, and other entertainment venues. Focuses on animal welfare, training methods, and housing standards.',
      keywords: ['entertainment', 'animals', 'ethics', 'welfare']
    }
  ];
  
  return mockPolicies.map((policy, index) => ({
    id: `${ministry.toLowerCase().replace(/\s+/g, '-')}-mock-${Date.now()}-${index}`,
    title: policy.title,
    description: policy.description,
    ministry: ministry,
    deadline: getRandomFutureDate(),
    sourceUrl: `https://example.gov.in/consultation-${index}`,
    discoveredAt: new Date().toISOString(),
    status: Math.random() > 0.7 ? 'urgent' : 'active',
    type: 'mock'
  }));
}

function getRandomFutureDate() {
  const today = new Date();
  const futureDate = new Date(today);
  futureDate.setDate(today.getDate() + Math.floor(Math.random() * 60) + 10); // 10-70 days from now
  return futureDate.toISOString().split('T')[0];
}