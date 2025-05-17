import { MastraClient } from "@mastra/client-js";

const mastraClient = new MastraClient({
  baseUrl: "https://code-review-agent.shiyefeng8800.workers.dev",
  retries: 2,
});

export const getCodeReviewAgent = () => {
  try {
    return mastraClient.getAgent("codeReviewAgent");
  } catch (error) {
    console.error("获取代码审查Agent失败:", error);
    throw new Error("无法连接到代码审查服务");
  }
};
