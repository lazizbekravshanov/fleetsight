"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useCredits } from "@/components/credits/credits-context";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const SUGGESTED_PROMPTS = [
  "What are common BASIC score thresholds?",
  "How does chameleon detection work?",
  "Explain OOS rates",
];

export function AICopilot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { refreshCredits } = useCredits();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  // Focus input when panel opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Keyboard shortcut: Cmd+J to toggle
  useEffect(() => {
    function handleKeydown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "j") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    }
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, []);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: Message = {
        id: `user-${Date.now()}`,
        role: "user",
        content: text.trim(),
      };

      const assistantMsg: Message = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);
      setInput("");
      setIsStreaming(true);

      try {
        const allMessages = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: allMessages }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Request failed" }));
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantMsg.id
                ? {
                    ...m,
                    content:
                      err.error === "Insufficient credits"
                        ? "You have run out of credits. Please purchase more to continue using AI Chat."
                        : `Error: ${err.error || "Something went wrong. Please try again."}`,
                  }
                : m
            )
          );
          setIsStreaming(false);
          return;
        }

        const reader = res.body?.getReader();
        if (!reader) {
          setIsStreaming(false);
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (!data) continue;

            try {
              const event = JSON.parse(data);

              if (event.text) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantMsg.id
                      ? { ...m, content: m.content + event.text }
                      : m
                  )
                );
              }

              if (event.done) {
                refreshCredits();
              }
            } catch {
              // Skip malformed events
            }
          }
        }
      } catch {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: "Error: Failed to connect. Please try again." }
              : m
          )
        );
      } finally {
        setIsStreaming(false);
      }
    },
    [isStreaming, messages, refreshCredits]
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearConversation = () => {
    setMessages([]);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-white shadow-lg transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2"
          aria-label="Open AI Chat"
          title="AI Copilot (Cmd+J)"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </button>
      )}

      {/* Backdrop on mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 sm:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sliding panel */}
      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l bg-surface-1 transition-transform duration-300 ease-in-out dark:bg-surface-0 sm:w-96 ${
          isOpen ? "translate-x-0" : "translate-x-full"
        } border-border dark:border-border`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3 dark:border-border">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent text-white">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5M14.25 3.104c.251.023.501.05.75.082M19 14.5l-2.47 2.47a2.25 2.25 0 01-1.59.659H9.06a2.25 2.25 0 01-1.59-.659L5 14.5m14 0V17a2.25 2.25 0 01-2.25 2.25H7.25A2.25 2.25 0 015 17v-2.5"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-ink dark:text-ink">
                FleetSight AI
              </h2>
              <p className="text-xs text-ink-soft dark:text-ink-muted">
                Carrier intelligence assistant
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button
                onClick={clearConversation}
                className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-soft dark:hover:bg-surface-1 dark:hover:text-ink-soft"
                title="Clear conversation"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsOpen(false)}
              className="rounded-md p-1.5 text-ink-muted transition-colors hover:bg-surface-2 hover:text-ink-soft dark:hover:bg-surface-1 dark:hover:text-ink-soft"
              title="Close (Cmd+J)"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent-soft dark:bg-accent-soft">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6 text-accent dark:text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="mb-1 text-sm font-medium text-ink dark:text-ink">
                Ask FleetSight AI
              </h3>
              <p className="mb-6 text-center text-xs text-ink-soft dark:text-ink-muted">
                Get help with carrier safety, FMCSA compliance, and freight
                intelligence.
              </p>
              <div className="flex w-full flex-col gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => sendMessage(prompt)}
                    className="rounded-lg border border-border px-3 py-2 text-left text-sm text-ink-soft transition-colors hover:border-accent/30 hover:bg-accent-soft dark:border-border dark:text-ink-soft dark:hover:border-accent dark:hover:bg-accent-soft"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-accent text-white"
                        : "bg-surface-2 text-ink dark:bg-surface-1 dark:text-ink"
                    }`}
                  >
                    {msg.role === "assistant" && msg.content === "" ? (
                      <TypingIndicator />
                    ) : (
                      <FormattedContent content={msg.content} />
                    )}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-border px-4 py-3 dark:border-border">
          <form onSubmit={handleSubmit} className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about carrier safety..."
              rows={1}
              className="flex-1 resize-none rounded-xl border border-border bg-surface-1 px-4 py-2.5 text-sm text-ink placeholder-gray-400 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent dark:border-border dark:bg-surface-1 dark:text-ink dark:placeholder-zinc-500 dark:focus:border-accent"
              style={{ maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isStreaming}
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19V5m0 0l-7 7m7-7l7 7"
                />
              </svg>
            </button>
          </form>
          <p className="mt-1.5 text-center text-[10px] text-ink-muted dark:text-ink-muted">
            1 credit per message. Cmd+J to toggle.
          </p>
        </div>
      </div>
    </>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-1">
      <span className="h-2 w-2 animate-bounce rounded-full bg-surface-3 dark:bg-surface-3 [animation-delay:-0.3s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-surface-3 dark:bg-surface-3 [animation-delay:-0.15s]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-surface-3 dark:bg-surface-3" />
    </div>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Simple markdown-like formatting
  const lines = content.split("\n");

  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        if (!line.trim()) return <br key={i} />;

        // Bold text
        let formatted = line.replace(
          /\*\*(.+?)\*\*/g,
          '<strong class="font-semibold">$1</strong>'
        );

        // Bullet points
        if (formatted.startsWith("- ") || formatted.startsWith("* ")) {
          return (
            <div key={i} className="flex gap-2">
              <span className="mt-0.5 flex-shrink-0 text-ink-muted dark:text-ink-muted">
                &bull;
              </span>
              <span dangerouslySetInnerHTML={{ __html: formatted.slice(2) }} />
            </div>
          );
        }

        // Numbered lists
        const numberedMatch = formatted.match(/^(\d+)\.\s(.+)/);
        if (numberedMatch) {
          return (
            <div key={i} className="flex gap-2">
              <span className="flex-shrink-0 text-ink-muted dark:text-ink-muted">
                {numberedMatch[1]}.
              </span>
              <span
                dangerouslySetInnerHTML={{ __html: numberedMatch[2] }}
              />
            </div>
          );
        }

        return (
          <p key={i} dangerouslySetInnerHTML={{ __html: formatted }} />
        );
      })}
    </div>
  );
}
