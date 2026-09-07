export type AIProviderType = 'none' | 'openai' | 'anthropic' | 'gemini' | 'ollama';

export interface AIProviderConfig {
  provider: AIProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

export interface SanitizedEntityContext {
  id: string;
  type: string;
  displayName: string;
  filePath?: string;
  confidence: string;
  detectorRule?: string;
  metadata: Record<string, unknown>;
}

export interface SanitizedTopologyContext {
  incomingRelations: Array<{ source: string; type: string }>;
  outgoingRelations: Array<{ target: string; type: string }>;
}

export interface AIExplanationPayload {
  entity: SanitizedEntityContext;
  topology: SanitizedTopologyContext;
  projectSummary: {
    name: string;
    frameworks: string[];
    packageManager?: string;
  };
}

export interface AIExplanationResponse {
  isConfigured: boolean;
  providerName: string;
  facts: string[];
  inferences: string[];
  unknowns: string[];
  summaryText?: string;
}
