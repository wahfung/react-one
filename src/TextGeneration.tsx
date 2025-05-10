import React, { useState } from "react";
import { useLazyQuery, gql } from "@apollo/client";

interface GenerationResponse {
  id: string;
  content: string;
  finishReason: string | null;
}

interface GenerateTextData {
  generateText: GenerationResponse;
}

interface GenerateTextVars {
  prompt: string;
}

// GraphQL查询
export const GENERATE_TEXT = gql`
  query GenerateText($prompt: String!) {
    generateText(prompt: $prompt) {
      id
      content
      finishReason
    }
  }
`;

// 组件样式
const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "20px",
    backgroundColor: "#f9f9f9",
    borderRadius: "8px",
    boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: "1.8rem",
    marginBottom: "16px",
    color: "#333",
    textAlign: "center" as const,
  },
  form: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "16px",
  },
  textarea: {
    minHeight: "120px",
    padding: "12px",
    borderRadius: "4px",
    border: "1px solid #ddd",
    fontSize: "1rem",
    fontFamily: "inherit",
  },
  button: {
    padding: "12px 24px",
    backgroundColor: "#4a6cf7",
    color: "white",
    border: "none",
    borderRadius: "4px",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "background-color 0.2s ease",
    alignSelf: "flex-start" as const,
  },
  buttonDisabled: {
    backgroundColor: "#a0a0a0",
    cursor: "not-allowed",
  },
  error: {
    color: "red",
    marginTop: "16px",
  },
  result: {
    marginTop: "24px",
    padding: "16px",
    backgroundColor: "white",
    borderRadius: "4px",
    border: "1px solid #eee",
    textAlign: "left" as const,
  },
  resultTitle: {
    fontSize: "1.2rem",
    marginBottom: "12px",
    color: "#333",
  },
  resultContent: {
    whiteSpace: "pre-wrap" as const,
    lineHeight: "1.6",
    color: "#333",
  },
};

const TextGeneration: React.FC = () => {
  const [prompt, setPrompt] = useState<string>("");
  const [generateText, { loading, error, data }] = useLazyQuery<
    GenerateTextData,
    GenerateTextVars
  >(GENERATE_TEXT, {
    fetchPolicy: "network-only", // 确保每次都从网络获取新数据
    onError: (error) => {
      console.error("GraphQL Error:", error);
      // 查看网络响应的详细信息
      if (error.networkError) {
        console.error("Network Error:", error.networkError);
      }
      // 查看GraphQL错误的详细信息
      if (error.graphQLErrors) {
        console.error("GraphQL Errors:", error.graphQLErrors);
      }
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (prompt.trim()) {
      generateText({ variables: { prompt: prompt.trim() } });
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>DeepSeek 文本生成</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="输入提示词..."
          style={styles.textarea}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            ...styles.button,
            ...(loading || !prompt.trim() ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? "生成中..." : "生成文本"}
        </button>
      </form>

      {error && (
        <div style={styles.error}>
          <p>错误: {error.message}</p>
          {error.graphQLErrors?.map((err, i) => (
            <p key={i}>GraphQL错误: {err.message}</p>
          ))}
          {error.networkError && <p>网络错误: {error.networkError.message}</p>}
        </div>
      )}

      {data && data.generateText && (
        <div style={styles.result}>
          <h3 style={styles.resultTitle}>生成结果:</h3>
          <p style={styles.resultContent}>{data.generateText.content}</p>
          {data.generateText.finishReason && (
            <div>
              <small>完成原因: {data.generateText.finishReason}</small>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TextGeneration;
