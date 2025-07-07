export const mockStats = {
  activeConsultations: 0,
  draftsGenerated: 0,
  successRate: 0,
  totalSubmissions: 0
};

// API endpoints for real data
export const API_BASE_URL = 'http://localhost:3001/api';

export const apiEndpoints = {
  policies: `${API_BASE_URL}/policies`,
  scrape: `${API_BASE_URL}/scrape`,
  analyze: `${API_BASE_URL}/policies/analyze`,
  generateDraft: `${API_BASE_URL}/policies/generate-draft`,
  testEmail: `${API_BASE_URL}/policies/test-email`,
  health: `${API_BASE_URL}/health`
};