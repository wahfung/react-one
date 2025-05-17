export interface GenerationResponse {
  id: string;
  content: string;
  finishReason: string | null;
}

export interface GenerateTextData {
  generateText: GenerationResponse;
}

export interface GenerateTextVars {
  prompt: string;
}

// 定义消息类型
export interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

// 定义Agent类型
export type AgentType = "chat" | "codeReview";