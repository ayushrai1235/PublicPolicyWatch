import { apiEndpoints } from '@/data/mockData';

export interface Policy {
  id: string;
  title: string;
  description: string;
  ministry: string;
  status: string;
  deadline: string;
  discoveredAt: string;
  sourceUrl: string;
  lastAnalyzed?: string;
  aiAnalysis?: {
    relevanceScore: number;
    isAnimalWelfare: boolean;
    publicSubmissionsOpen: boolean;
    draftsGenerated: number;
    urgencyLevel: string;
    keyPoints: string[];
    animalWelfareAspects: string[];
    analysis: string;
    drafts: {
      legal: string;
      emotional: string;
      dataBacked: string;
    };
  };
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  message?: string;
}

class ApiService {
  private async request<T>(url: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
        ...options,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('API request failed:', error);
      return { error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  async getPolicies(): Promise<ApiResponse<Policy[]>> {
    return this.request<Policy[]>(apiEndpoints.policies);
  }

  async getPolicy(id: string): Promise<ApiResponse<Policy>> {
    return this.request<Policy>(`${apiEndpoints.policies}/${id}`);
  }

  async triggerScraping(): Promise<ApiResponse<{ message: string; policiesFound: number; totalPolicies: number }>> {
    return this.request<{ message: string; policiesFound: number; totalPolicies: number }>(apiEndpoints.scrape, {
      method: 'POST',
    });
  }

  async analyzePending(): Promise<ApiResponse<{ analyzed: number; relevant: number }>> {
    return this.request<{ analyzed: number; relevant: number }>(`${apiEndpoints.policies.replace('/policies', '')}/analyze-pending`, {
      method: 'POST',
    });
  }

  async analyzePolicy(policy: Partial<Policy>): Promise<ApiResponse<any>> {
    return this.request(apiEndpoints.analyze, {
      method: 'POST',
      body: JSON.stringify({ policy }),
    });
  }

  async generateDraft(policy: Policy, tone: string): Promise<ApiResponse<{ draft: string }>> {
    return this.request<{ draft: string }>(apiEndpoints.generateDraft, {
      method: 'POST',
      body: JSON.stringify({ policy, tone }),
    });
  }

  async clearPolicies(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(`${apiEndpoints.policies}/clear`, {
      method: 'DELETE',
    });
  }

  async sendTestEmail(): Promise<ApiResponse<{ message: string }>> {
    return this.request<{ message: string }>(apiEndpoints.testEmail, {
      method: 'POST',
    });
  }

  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string; stats: any }>> {
    return this.request<{ status: string; timestamp: string; stats: any }>(apiEndpoints.health);
  }
}

export const apiService = new ApiService();