import { apiClient } from "./client";

export interface CustomPrompt {
  id: string;
  prompt_type: string;
  name: string;
  system_prompt: string;
  is_active: boolean;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface PromptsResponse {
  prompts: CustomPrompt[];
  defaults: Record<string, string>;
}

export interface DiscussResponse {
  response: string;
  prompt_type: string;
}

export const promptsApi = {
  list: async (type?: string): Promise<PromptsResponse> => {
    const params = type ? { type } : undefined;
    return apiClient.get<PromptsResponse>("/prompts", params);
  },

  create: async (data: {
    prompt_type: string;
    name: string;
    system_prompt: string;
    is_active?: boolean;
  }): Promise<CustomPrompt> => {
    return apiClient.post<CustomPrompt>("/prompts", data);
  },

  update: async (
    id: string,
    data: {
      name?: string;
      system_prompt?: string;
      is_active?: boolean;
    }
  ): Promise<CustomPrompt> => {
    return apiClient.put<CustomPrompt>(`/prompts/${id}`, data);
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/prompts/${id}`);
  },

  discuss: async (data: {
    prompt_type: string;
    current_prompt?: string;
    message: string;
  }): Promise<DiscussResponse> => {
    return apiClient.post<DiscussResponse>("/prompts/discuss", data);
  },

  resetToDefault: async (
    promptType: string
  ): Promise<{ message: string; default_prompt: string }> => {
    return apiClient.post<{ message: string; default_prompt: string }>(
      `/prompts/reset/${promptType}`
    );
  },
};
