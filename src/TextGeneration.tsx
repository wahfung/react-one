// src/components/TextGeneration.tsx
import React, { useState, useRef, useEffect } from "react";
import { useLazyQuery, gql, ApolloError } from "@apollo/client";
import { getCodeReviewAgent } from "./utils/index";

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
const GENERATE_TEXT = gql`
  query GenerateText($prompt: String!) {
    generateText(prompt: $prompt) {
      id
      content
      finishReason
    }
  }
`;

// 定义Agent类型
type AgentType = "chat" | "codeReview";

// 组件样式
const styles = {
  container: {
    maxWidth: "850px",
    margin: "0 auto",
    padding: "24px",
    backgroundColor: "#f8f9fa",
    borderRadius: "16px",
    boxShadow: "0 5px 30px rgba(0,0,0,0.1)",
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "20px",
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
  },
  logoContainer: {
    width: "42px",
    height: "42px",
    borderRadius: "12px",
    backgroundColor: "#4a6cf7",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginRight: "14px",
    boxShadow: "0 2px 8px rgba(74,108,247,0.25)",
  },
  logo: {
    color: "white",
    fontSize: "20px",
    fontWeight: "bold" as const,
  },
  titleContainer: {
    display: "flex",
    flexDirection: "column" as const,
  },
  title: {
    fontSize: "1.5rem",
    fontWeight: "600",
    color: "#212529",
    margin: "0",
  },
  subtitle: {
    fontSize: "0.9rem",
    color: "#6c757d",
    marginTop: "4px",
  },
  agentSelector: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#e9ecef",
    borderRadius: "24px",
    padding: "4px",
  },
  agentButton: {
    padding: "8px 16px",
    borderRadius: "20px",
    fontSize: "0.9rem",
    fontWeight: "500",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    backgroundColor: "transparent",
    color: "#495057",
  },
  agentButtonActive: {
    backgroundColor: "white",
    color: "#4a6cf7",
    boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
  },
  agentIcon: {
    marginRight: "6px",
    fontSize: "14px",
  },
  chatContainer: {
    marginTop: "20px",
    border: "1px solid #e9ecef",
    borderRadius: "12px",
    backgroundColor: "white",
    height: "380px",
    overflowY: "auto" as const,
    padding: "20px",
    display: "flex",
    flexDirection: "column" as const,
    boxShadow: "inset 0 2px 6px rgba(0,0,0,0.03)",
  },
  messageContainer: {
    display: "flex",
    marginBottom: "20px",
    transition: "opacity 0.3s ease",
  },
  userMessageContainer: {
    justifyContent: "flex-end" as const,
  },
  aiMessageContainer: {
    justifyContent: "flex-start" as const,
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "16px",
    fontWeight: "bold" as const,
    color: "white",
  },
  userAvatar: {
    backgroundColor: "#6c757d",
    marginLeft: "12px",
  },
  aiAvatar: {
    backgroundColor: "#4a6cf7",
    marginRight: "12px",
  },
  message: {
    maxWidth: "70%",
    padding: "14px 18px",
    borderRadius: "18px",
    fontSize: "0.95rem",
    lineHeight: "1.6",
    whiteSpace: "pre-wrap" as const,
  },
  userMessage: {
    backgroundColor: "#e9ecef",
    color: "#212529",
    borderTopRightRadius: "4px",
  },
  aiMessage: {
    backgroundColor: "#f1f5ff",
    color: "#212529",
    borderTopLeftRadius: "4px",
    textAlign: "left" as const,
  },
  codeBlock: {
    backgroundColor: "#282c34",
    color: "#abb2bf",
    borderRadius: "6px",
    padding: "12px",
    overflowX: "auto" as const,
    fontSize: "0.9rem",
    fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    marginTop: "8px",
    marginBottom: "8px",
  },
  highlightSection: {
    backgroundColor: "rgba(255, 170, 50, 0.2)",
    borderLeft: "3px solid #ffaa32",
    padding: "1px 0 1px 8px",
    margin: "8px 0",
  },
  loadingMessage: {
    display: "flex",
    alignItems: "center",
  },
  loadingDot: {
    width: "8px",
    height: "8px",
    backgroundColor: "#4a6cf7",
    borderRadius: "50%",
    margin: "0 2px",
    opacity: 0.6,
  },
  inputContainer: {
    marginTop: "20px",
    display: "flex",
    position: "relative" as const,
  },
  textarea: {
    flexGrow: 1,
    padding: "16px 60px 16px 18px",
    borderRadius: "24px",
    border: "1px solid #dee2e6",
    fontSize: "0.95rem",
    resize: "none" as const,
    outline: "none",
    transition: "all 0.2s ease",
    minHeight: "56px",
    maxHeight: "160px",
    lineHeight: "1.5",
    boxShadow: "0 2px 10px rgba(0,0,0,0.03)",
  },
  sendButton: {
    position: "absolute" as const,
    right: "10px",
    bottom: "10px",
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    backgroundColor: "#4a6cf7",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "none",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(74,108,247,0.25)",
    fontSize: "18px",
  },
  sendButtonDisabled: {
    backgroundColor: "#adb5bd",
    boxShadow: "none",
    cursor: "not-allowed",
  },
  error: {
    backgroundColor: "#fff5f5",
    color: "#e03131",
    padding: "12px 16px",
    borderRadius: "8px",
    marginTop: "16px",
    fontSize: "0.9rem",
    textAlign: "left" as const,
    boxShadow: "0 2px 8px rgba(224,49,49,0.1)",
    display: "flex",
    alignItems: "flex-start",
    border: "1px solid #ffe3e3",
  },
  errorIcon: {
    marginRight: "10px",
    fontSize: "16px",
    marginTop: "1px",
  },
  hint: {
    marginTop: "16px",
    fontSize: "0.85rem",
    color: "#6c757d",
    textAlign: "center" as const,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  hintIcon: {
    marginRight: "6px",
    fontSize: "14px",
  },
  typingIndicator: {
    display: "flex",
    padding: "0 16px",
  },
  typingDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    backgroundColor: "#6c757d",
    margin: "0 1px",
    opacity: 0.6,
  },
  poweredBy: {
    fontSize: "0.8rem",
    color: "#adb5bd",
    marginTop: "16px",
    textAlign: "center" as const,
  },
  agentInfo: {
    padding: "12px 16px",
    backgroundColor: "#f8f9fa",
    borderRadius: "8px",
    marginBottom: "16px",
    fontSize: "0.9rem",
    color: "#495057",
    display: "flex",
    alignItems: "center",
    border: "1px solid #e9ecef",
  },
  agentInfoIcon: {
    marginRight: "10px",
    fontSize: "16px",
    color: "#4a6cf7",
  },
  clearButton: {
    backgroundColor: "transparent",
    border: "none",
    color: "#6c757d",
    fontSize: "0.85rem",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    marginLeft: "16px",
  },
  clearIcon: {
    marginRight: "4px",
    fontSize: "12px",
  },
};

// 根据消息内容和agent类型处理消息格式化
const formatMessage = (
  content: string,
  agentType: AgentType
): React.ReactNode => {
  if (agentType === "codeReview") {
    // 尝试解析代码块和高亮部分
    const formattedContent: React.ReactNode[] = [];
    let currentIndex = 0;

    // 简单的正则表达式匹配代码块 ```code```
    const codeBlockPattern = /```([^`]+)```/g;
    let match;

    while ((match = codeBlockPattern.exec(content)) !== null) {
      // 添加代码块前的文本
      if (match.index > currentIndex) {
        formattedContent.push(
          <span key={`text-${currentIndex}`}>
            {content.slice(currentIndex, match.index)}
          </span>
        );
      }

      // 添加代码块
      formattedContent.push(
        <div key={`code-${match.index}`} style={styles.codeBlock}>
          {match[1]}
        </div>
      );

      currentIndex = match.index + match[0].length;
    }

    // 添加剩余的文本
    if (currentIndex < content.length) {
      formattedContent.push(
        <span key={`text-${currentIndex}`}>{content.slice(currentIndex)}</span>
      );
    }

    // 处理高亮部分 (例如: "❗ Issue: ...")
    const finalContent = formattedContent.map((node: any, index) => {
      const nodePC = node.props.children;
      if (typeof node === "string" || typeof nodePC === "string") {
        const text = typeof node === "string" ? node : nodePC;

        const issuePattern =
          /(❗\s*Issue:|⚠️\s*Warning:|✅\s*Good:|📝\s*Suggestion:)([^❗⚠️✅📝]+)/g;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        let highlightMatch;
        while ((highlightMatch = issuePattern.exec(text)) !== null) {
          // 添加前面的普通文本
          if (highlightMatch.index > lastIndex) {
            parts.push(text.slice(lastIndex, highlightMatch.index));
          }

          // 添加高亮部分
          parts.push(
            <div
              key={`highlight-${highlightMatch.index}`}
              style={styles.highlightSection}
            >
              <strong>{highlightMatch[1]}</strong> {highlightMatch[2]}
            </div>
          );

          lastIndex = highlightMatch.index + highlightMatch[0].length;
        }

        // 添加剩余的文本
        if (lastIndex < text.length) {
          parts.push(text.slice(lastIndex));
        }

        return parts.length > 1 ? (
          <span key={`formatted-${index}`}>{parts}</span>
        ) : (
          node
        );
      }

      return node;
    });

    return <>{finalContent}</>;
  }

  // 聊天模式简单返回文本
  return content;
};

// 定义消息类型
interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: Date;
}

const TextGeneration: React.FC = () => {
  const [agentType, setAgentType] = useState<AgentType>("chat");
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // GraphQL查询
  const [generateText, { loading, error }] = useLazyQuery<
    GenerateTextData,
    GenerateTextVars
  >(GENERATE_TEXT, {
    fetchPolicy: "network-only",
    onCompleted: (data) => {
      if (data && data.generateText) {
        const aiMessage: Message = {
          id: data.generateText.id,
          content: data.generateText.content,
          sender: "ai",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, aiMessage]);
      }
    },
  });

  // 初始化欢迎消息
  useEffect(() => {
    setMessages([
      {
        id: "welcome",
        content:
          agentType === "chat"
            ? "你好！我是DeepSeek AI助手，有什么可以帮助你的吗？"
            : "你好！我是DeepSeek代码审查助手。请提交你的代码，我将帮你审查并提供优化建议。",
        sender: "ai",
        timestamp: new Date(),
      },
    ]);
  }, [agentType]);

  // 自动滚动到底部
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop =
        chatContainerRef.current.scrollHeight;
    }
  }, [messages, loading]);

  // 自动调整textarea高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        160
      )}px`;
    }
  }, [prompt]);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (!prompt.trim() || loading) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: prompt.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (agentType === "chat") {
      generateText({
        variables: {
          prompt: prompt.trim(),
        },
      });
    } else {
      try {
        const agent = getCodeReviewAgent();
        const response = await agent.generate({
          messages: [
            {
              role: "user",
              content: `请审查以下代码:\n\n${prompt.trim()}`,
            },
          ],
        });
        const { timestamp, id } = response.response;

        const aiMessage: Message = {
          id,
          content: response.text,
          sender: "ai",
          timestamp,
        };
        setMessages((prev) => [...prev, aiMessage]);
      } catch (error) {}
    }
    setPrompt("");

    // 重置textarea高度
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const changeAgent = (type: AgentType) => {
    if (type !== agentType) {
      setAgentType(type);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome",
        content:
          agentType === "chat"
            ? "对话已清空。我是DeepSeek AI助手，有什么可以帮助你的吗？"
            : "对话已清空。我是DeepSeek代码审查助手，请提交你的代码，我将帮你审查。",
        sender: "ai",
        timestamp: new Date(),
      },
    ]);
  };

  // 辅助函数，用于处理 Apollo 错误
  const renderError = (error: ApolloError | undefined) => {
    if (!error) return null;

    return (
      <div style={styles.error}>
        <span style={styles.errorIcon}>⚠️</span>
        <div>
          <strong>出错了！</strong>
          <p style={{ margin: "4px 0" }}>{error.message}</p>
          {error.networkError && (
            <p style={{ margin: "4px 0", fontSize: "0.85rem" }}>
              网络错误: {error.networkError.message}
            </p>
          )}
        </div>
      </div>
    );
  };

  // 获取Agent的提示信息
  const getAgentHint = () => {
    if (loading) return "正在思考中...";

    if (agentType === "chat") {
      return "有任何问题都可以直接问我";
    } else {
      return "粘贴代码片段，我将审查并提供改进建议";
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logoSection}>
          <div style={styles.logoContainer}>
            <div style={styles.logo}>D</div>
          </div>
          <div style={styles.titleContainer}>
            <h2 style={styles.title}>DeepSeek AI</h2>
            <p style={styles.subtitle}>智能助手</p>
          </div>
        </div>

        <div style={styles.agentSelector}>
          <button
            style={{
              ...styles.agentButton,
              ...(agentType === "chat" ? styles.agentButtonActive : {}),
            }}
            onClick={() => changeAgent("chat")}
          >
            <span style={styles.agentIcon}>💬</span>
            聊天助手
          </button>
          <button
            style={{
              ...styles.agentButton,
              ...(agentType === "codeReview" ? styles.agentButtonActive : {}),
            }}
            onClick={() => changeAgent("codeReview")}
          >
            <span style={styles.agentIcon}>👨‍💻</span>
            代码审查
          </button>
        </div>
      </div>

      <div style={styles.agentInfo}>
        <span style={styles.agentInfoIcon}>
          {agentType === "chat" ? "💬" : "👨‍💻"}
        </span>
        <span>
          {agentType === "chat"
            ? "聊天模式：可以询问任何问题，获取信息或帮助。"
            : "代码审查模式：提交代码，AI将分析、检查问题并提供改进建议。"}
        </span>
        {messages.length > 1 && (
          <button style={styles.clearButton} onClick={clearChat}>
            <span style={styles.clearIcon}>🗑️</span>
            清空对话
          </button>
        )}
      </div>

      <div style={styles.chatContainer} ref={chatContainerRef}>
        {messages.map((message) => (
          <div
            key={message.id}
            style={{
              ...styles.messageContainer,
              ...(message.sender === "user"
                ? styles.userMessageContainer
                : styles.aiMessageContainer),
            }}
          >
            {message.sender === "ai" && (
              <div style={{ ...styles.avatar, ...styles.aiAvatar }}>
                {agentType === "chat" ? "D" : "👨‍💻"}
              </div>
            )}
            <div
              style={{
                ...styles.message,
                ...(message.sender === "user"
                  ? styles.userMessage
                  : styles.aiMessage),
              }}
            >
              {message.sender === "ai"
                ? formatMessage(message.content, agentType)
                : message.content}
            </div>
            {message.sender === "user" && (
              <div style={{ ...styles.avatar, ...styles.userAvatar }}>你</div>
            )}
          </div>
        ))}

        {loading && (
          <div
            style={{ ...styles.messageContainer, ...styles.aiMessageContainer }}
          >
            <div style={{ ...styles.avatar, ...styles.aiAvatar }}>
              {agentType === "chat" ? "D" : "👨‍💻"}
            </div>
            <div
              style={{
                ...styles.message,
                ...styles.aiMessage,
                ...styles.loadingMessage,
              }}
            >
              <div
                style={{
                  ...styles.typingDot,
                  animation: "pulse 1s infinite",
                }}
              ></div>
              <div
                style={{
                  ...styles.typingDot,
                  animation: "pulse 1s infinite 0.2s",
                }}
              ></div>
              <div
                style={{
                  ...styles.typingDot,
                  animation: "pulse 1s infinite 0.4s",
                }}
              ></div>
            </div>
          </div>
        )}
      </div>

      {renderError(error)}

      <form onSubmit={handleSubmit} style={styles.inputContainer}>
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder={
            agentType === "chat" ? "输入您的问题..." : "粘贴代码片段进行审查..."
          }
          style={{
            ...styles.textarea,
            borderColor: agentType === "chat" ? "#4a6cf7" : "#ffaa32",
          }}
          disabled={loading}
          rows={1}
        />
        <button
          type="submit"
          disabled={loading || !prompt.trim()}
          style={{
            ...styles.sendButton,
            ...(loading || !prompt.trim() ? styles.sendButtonDisabled : {}),
            backgroundColor: agentType === "chat" ? "#4a6cf7" : "#ffaa32",
          }}
          aria-label="发送"
        >
          →
        </button>
      </form>

      <div style={styles.hint}>
        <span style={styles.hintIcon}>
          {agentType === "chat" ? "💡" : "🔍"}
        </span>
        {getAgentHint()}
      </div>

      <div style={styles.poweredBy}>由 DeepSeek AI 提供技术支持</div>
    </div>
  );
};

export default TextGeneration;
