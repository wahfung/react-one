import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { useLazyQuery, gql, ApolloError } from "@apollo/client";
import { getCodeReviewAgent } from "@/utils/index";
import { styles } from "./styles";
import {
  GenerateTextData,
  GenerateTextVars,
  Message,
  AgentType,
} from "./types";

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

// 使用记忆化技术缓存已处理的消息
const messageCache = new Map<string, React.ReactNode>();

// 根据消息内容和agent类型处理消息格式化
const formatMessage = (
  content: string,
  agentType: AgentType
): React.ReactNode => {
  // 聊天模式简单返回文本
  if (agentType !== "codeReview") {
    return content;
  }

  // 检查缓存中是否已有此消息的格式化结果
  const cacheKey = `${content}-${agentType}`;
  if (messageCache.has(cacheKey)) {
    return messageCache.get(cacheKey);
  }

  // 处理代码审查模式
  try {
    // 尝试解析代码块和高亮部分
    const formattedContent: React.ReactNode[] = [];
    let currentIndex = 0;

    // 预先编译正则表达式
    const issuePattern =
      /(❗\s*Issue:|⚠️\s*Warning:|✅\s*Good:|📝\s*Suggestion:)([^❗⚠️✅📝]+)/g;

    formattedContent.push(
      <span key={`text-${currentIndex}`}>{content.slice(currentIndex)}</span>
    );

    // 处理高亮部分 - 使用函数简化处理逻辑
    const processNode = (node: any, index: number): React.ReactNode => {
      // 安全地检查node是否为React元素，并具有props.children
      if (
        node &&
        typeof node === "object" &&
        "props" in node &&
        node.props &&
        "children" in node.props
      ) {
        const nodePC = node.props.children;

        // 只处理字符串内容
        if (typeof nodePC === "string") {
          const text = nodePC;
          const parts: React.ReactNode[] = [];
          let lastIndex = 0;

          // 重置正则表达式
          issuePattern.lastIndex = 0;

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
      } else if (typeof node === "string") {
        // 直接处理字符串节点
        const text = node;
        const parts: React.ReactNode[] = [];
        let lastIndex = 0;

        // 重置正则表达式
        issuePattern.lastIndex = 0;

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
          <span key={`string-${index}`}>{parts}</span>
        ) : (
          node
        );
      }

      return node;
    };

    // 处理所有节点
    const finalContent = formattedContent.map(processNode);

    // 缓存结果
    const result = <>{finalContent}</>;
    messageCache.set(cacheKey, result);

    // 限制缓存大小，避免内存泄漏
    if (messageCache.size > 100) {
      const firstKey = messageCache.keys().next().value;
      messageCache.delete(firstKey);
    }

    return result;
  } catch (error) {
    console.error("Error formatting message:", error);
    // 出错时返回原始内容
    return content;
  }
};

// 使用延迟处理的消息组件
const DelayedMessageContent: React.FC<{
  content: string;
  agentType: AgentType;
}> = ({ content, agentType }) => {
  const [formattedContent, setFormattedContent] =
    useState<React.ReactNode>(content);
  const [isFormatted, setIsFormatted] = useState(false);

  useEffect(() => {
    if (agentType !== "codeReview" || isFormatted) {
      return;
    }

    // 使用requestIdleCallback或setTimeout延迟格式化
    const timeoutId = setTimeout(() => {
      const formatted = formatMessage(content, agentType);
      setFormattedContent(formatted);
      setIsFormatted(true);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [content, agentType, isFormatted]);

  // 初始渲染简单内容，然后异步处理格式化
  return <>{formattedContent}</>;
};

const TextGeneration: React.FC = () => {
  const [agentType, setAgentType] = useState<AgentType>("chat");
  const [prompt, setPrompt] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [isReviewing, setIsReviewing] = useState(false); // 新增: 代码审查加载状态
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 记忆化getCodeReviewAgent调用
  const codeReviewAgent = useMemo(() => {
    try {
      return getCodeReviewAgent();
    } catch (error) {
      console.error("Failed to initialize code review agent:", error);
      return null;
    }
  }, []);

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

  // 自动滚动到底部 - 使用debounce
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop =
          chatContainerRef.current.scrollHeight;
      }
    }, 10);

    return () => clearTimeout(scrollTimeout);
  }, [messages, loading, isReviewing]); // 添加isReviewing到依赖项

  // 添加CSS动画
  useEffect(() => {
    // 创建style元素
    const style = document.createElement("style");

    // 添加动画定义
    style.textContent = `
      @keyframes pulse {
        0% { opacity: 0.4; }
        50% { opacity: 0.8; }
        100% { opacity: 0.4; }
      }
    `;

    // 将style元素添加到head中
    document.head.appendChild(style);

    // 组件卸载时移除style元素
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // 自动调整textarea高度 - 加入节流逻辑
  useEffect(() => {
    if (!textareaRef.current) return;

    const textarea = textareaRef.current;
    textarea.style.height = "auto";

    // 使用requestAnimationFrame避免布局抖动
    requestAnimationFrame(() => {
      textarea.style.height = `${Math.min(textarea.scrollHeight, 160)}px`;
    });
  }, [prompt]);

  // 记忆化处理提交函数
  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      if (e) e.preventDefault();

      if (!prompt.trim() || loading || isReviewing) return; // 添加isReviewing检查

      const userMessage: Message = {
        id: `user-${Date.now()}`,
        content: prompt.trim(),
        sender: "user",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);

      // 清空输入框，优先响应UI
      setPrompt("");

      // 重置textarea高度
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }

      // 延迟一帧再处理生成，让UI先更新
      requestAnimationFrame(async () => {
        try {
          if (agentType === "chat") {
            generateText({
              variables: {
                prompt: userMessage.content,
              },
            });
          } else if (codeReviewAgent) {
            // 代码审查处理 - 设置加载状态
            setIsReviewing(true);

            try {
              const response = await codeReviewAgent.generate({
                messages: [
                  {
                    role: "user",
                    content: `请审查以下代码:\n\n${userMessage.content}`,
                  },
                ],
              });
              const { timestamp, id } = response.response || {
                timestamp: new Date(),
                id: `codereview-${Date.now()}`,
              };

              const aiMessage: Message = {
                id: id || `codereview-${Date.now()}`,
                content: response.text || "抱歉，代码审查过程中发生错误",
                sender: "ai",
                timestamp: timestamp || new Date(),
              };
              setMessages((prev) => [...prev, aiMessage]);
            } catch (error) {
              console.error("Code review failed:", error);
              const aiMessage: Message = {
                id: `error-${Date.now()}`,
                content: "代码审查处理过程中发生错误，请重试或联系管理员。",
                sender: "ai",
                timestamp: new Date(),
              };
              setMessages((prev) => [...prev, aiMessage]);
            } finally {
              // 结束加载状态
              setIsReviewing(false);
            }
          } else {
            // 代码审查客户端不可用
            const aiMessage: Message = {
              id: `unavailable-${Date.now()}`,
              content: "代码审查服务暂时不可用，请稍后再试。",
              sender: "ai",
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, aiMessage]);
          }
        } catch (error) {
          console.error("Message processing error:", error);
          // 确保任何错误都会清除加载状态
          setIsReviewing(false);
        }
      });
    },
    [prompt, loading, isReviewing, agentType, generateText, codeReviewAgent]
  );

  const handleKeyPress = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const changeAgent = useCallback(
    (type: AgentType) => {
      if (type !== agentType) {
        setAgentType(type);
      }
    },
    [agentType]
  );

  const clearChat = useCallback(() => {
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
  }, [agentType]);

  // 辅助函数，用于处理 Apollo 错误
  const renderError = useCallback((error: ApolloError | undefined) => {
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
  }, []);

  // 获取Agent的提示信息
  const getAgentHint = useCallback(() => {
    if (loading || isReviewing) return "正在思考中..."; // 修改: 添加isReviewing检查

    if (agentType === "chat") {
      return "有任何问题都可以直接问我";
    } else {
      return "粘贴代码片段，我将审查并提供改进建议";
    }
  }, [agentType, loading, isReviewing]); // 修改: 添加isReviewing到依赖项

  // 检查是否正在加载
  const isLoading = loading || isReviewing; // 合并两种加载状态

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.logoSection}>
          <div style={styles.logoContainer}>
            <div style={styles.logo}>D</div>
          </div>
          <div style={styles.titleContainer}>
            <h2 style={styles.title}>DeepSeek AI</h2>
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
              {message.sender === "ai" ? (
                <DelayedMessageContent
                  content={message.content}
                  agentType={agentType}
                />
              ) : (
                message.content
              )}
            </div>
            {message.sender === "user" && (
              <div style={{ ...styles.avatar, ...styles.userAvatar }}>你</div>
            )}
          </div>
        ))}

        {/* 修改: 统一显示loading状态, 包括聊天和代码审查 */}
        {isLoading && (
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
          disabled={isLoading} // 修改: 使用合并的loading状态
          rows={1}
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()} // 修改: 使用合并的loading状态
          style={{
            ...styles.sendButton,
            ...(isLoading || !prompt.trim() ? styles.sendButtonDisabled : {}), // 修改: 使用合并的loading状态
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
    </div>
  );
};

export default TextGeneration;
