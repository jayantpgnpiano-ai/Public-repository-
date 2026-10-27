import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Trash2, Copy, BookOpen, Feather, Lightbulb, Compass, Check } from 'lucide-react';
import { AIMessageItem, AIConversationData } from '../types';
import { useAuth } from '../context/AuthContext';
import { useToast } from './Toast';

export const AICompanionView: React.FC = () => {
  const { user, token } = useAuth();
  const { showToast } = useToast();

  const [conversation, setConversation] = useState<AIConversationData | null>(null);
  const [inputText, setInputText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const promptStarters = [
    {
      title: 'Brainstorm Reflection',
      prompt: 'Help me draft a thoughtful observation on balancing modern technology with slow living.',
      icon: Feather,
    },
    {
      title: 'Design Critique',
      prompt: 'What are the essential rules for creating editorial typography and soft-neutral UI interfaces?',
      icon: Lightbulb,
    },
    {
      title: 'Reading Companion',
      prompt: 'Recommend 3 books on architecture, intentional craft, and creative solitude.',
      icon: BookOpen,
    },
    {
      title: 'Clarity & Focus',
      prompt: 'How can I organize a daily writing habit without falling into algorithmic distraction?',
      icon: Compass,
    },
  ];

  const fetchAIConversation = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/ai/conversations', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversation(data);
      }
    } catch (err) {
      console.error('Error fetching AI conversation:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAIConversation();
  }, [token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversation?.messages, isGenerating]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || isGenerating || !token) return;

    setInputText('');
    setIsGenerating(true);

    // Optimistically append user message
    const tempUserMsg: AIMessageItem = {
      id: 'usr_' + Date.now(),
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setConversation(prev =>
      prev
        ? { ...prev, messages: [...prev.messages, tempUserMsg] }
        : {
            id: 'conv_temp',
            userId: user?.id || '',
            title: 'Companion Dialogue',
            messages: [tempUserMsg],
            updatedAt: new Date().toISOString(),
          }
    );

    try {
      const res = await fetch('/api/ai/companion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: text }),
      });

      if (res.ok) {
        const data = await res.json();
        setConversation(prev =>
          prev
            ? { ...prev, messages: [...prev.messages, data.message] }
            : null
        );
      } else {
        showToast('AI service response unavailable. Please try again.', 'error');
      }
    } catch {
      showToast('Network error while conversing with companion.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleClearHistory = async () => {
    if (!token) return;
    if (!confirm('Clear your conversation history with Connect AI?')) return;

    try {
      const res = await fetch('/api/ai/conversations/clear', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setConversation(data.conversation);
        showToast('Dialogue history reset.', 'info');
      }
    } catch {
      showToast('Could not clear history', 'error');
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Copied to clipboard', 'info');
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto h-[calc(100vh-4rem)] md:h-screen p-4 md:p-6 flex flex-col">
      <div className="bg-white rounded-2xl border border-[#E8E4DC] flex-1 flex flex-col overflow-hidden shadow-xs">
        {/* Header */}
        <div className="p-4 border-b border-[#E8E4DC] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#2A2724] text-[#FAF8F5] flex items-center justify-center shadow-xs">
              <Sparkles className="w-5 h-5 text-[#EFECE6]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif-editorial text-lg font-medium text-[#1C1917]">
                  Connect AI
                </h2>
                <span className="text-[11px] text-[#8C857B]">· Personal Companion</span>
              </div>
              <div className="text-[11px] text-[#78716C]">
                Private thinking & writing partner
              </div>
            </div>
          </div>

          <button
            onClick={handleClearHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8E4DC] bg-white hover:bg-[#FAF8F5] text-xs text-[#78716C] hover:text-[#8C2C1D] transition-colors"
            title="Clear conversation history"
            aria-label="Clear chat history"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear Dialogue</span>
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-5 bg-[#FAF8F5]/30">
          {isLoading ? (
            <div className="text-center py-12 text-xs text-[#8C857B]">
              Opening companion session...
            </div>
          ) : (
            <>
              {conversation?.messages.map(msg => {
                const isModel = msg.role === 'model';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}
                  >
                    <div className="flex items-center gap-2 mb-1.5 px-1">
                      {isModel ? (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-[#8A5F38]" />
                          <span className="text-xs font-medium text-[#57534E]">Connect AI</span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-[#78716C]">You</span>
                      )}
                    </div>

                    <div
                      className={`max-w-[85%] p-4 rounded-2xl text-[14.5px] leading-relaxed relative group ${
                        isModel
                          ? 'bg-white border border-[#E8E4DC] text-[#2A2724] shadow-2xs rounded-tl-xs'
                          : 'bg-[#2A2724] text-[#FAF8F5] rounded-tr-xs'
                      }`}
                    >
                      <div className="whitespace-pre-line">{msg.text}</div>

                      {/* Copy action for model messages */}
                      {isModel && (
                        <button
                          onClick={() => handleCopy(msg.text, msg.id)}
                          className="absolute top-2 right-2 p-1.5 rounded-md bg-[#FAF8F5] text-[#78716C] hover:text-[#1C1917] opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Copy response"
                          aria-label="Copy AI response"
                        >
                          {copiedId === msg.id ? (
                            <Check className="w-3.5 h-3.5 text-[#536958]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Generating Typing Indicator */}
              {isGenerating && (
                <div className="flex flex-col items-start">
                  <div className="flex items-center gap-2 mb-1.5 px-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#8A5F38] animate-pulse" />
                    <span className="text-xs font-medium text-[#57534E]">Connect AI is reflecting...</span>
                  </div>
                  <div className="bg-white border border-[#E8E4DC] p-3.5 rounded-2xl rounded-tl-xs shadow-2xs flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#8A5F38] animate-bounce" />
                    <span
                      className="w-2 h-2 rounded-full bg-[#8A5F38] animate-bounce"
                      style={{ animationDelay: '0.2s' }}
                    />
                    <span
                      className="w-2 h-2 rounded-full bg-[#8A5F38] animate-bounce"
                      style={{ animationDelay: '0.4s' }}
                    />
                  </div>
                </div>
              )}

              {/* Suggested Starters (shown if only 1 message exists) */}
              {conversation?.messages.length === 1 && !isGenerating && (
                <div className="pt-4">
                  <div className="text-xs font-semibold text-[#78716C] uppercase tracking-wider mb-3">
                    Inspiration & Prompts
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {promptStarters.map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={idx}
                          onClick={() => handleSendMessage(item.prompt)}
                          className="p-3 rounded-xl border border-[#E8E4DC] bg-white hover:bg-[#FAF8F5] text-left transition-all hover:border-[#D5D0C4] flex items-start gap-3 group"
                        >
                          <div className="p-2 rounded-lg bg-[#FAF8F5] text-[#78716C] group-hover:text-[#1C1917] mt-0.5">
                            <Icon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-semibold text-[#1C1917] mb-1">
                              {item.title}
                            </div>
                            <div className="text-[12px] text-[#57534E] leading-normal line-clamp-2">
                              {item.prompt}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={e => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="p-3.5 border-t border-[#E8E4DC] bg-white flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask Connect AI to brainstorm, critique, synthesize, or write..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            disabled={isGenerating}
            className="flex-1 px-4 py-2.5 rounded-xl border border-[#E8E4DC] bg-[#FAF8F5] text-sm text-[#1C1917] placeholder-[#A8A29E] focus:outline-none focus:border-[#2A2724]"
          />
          <button
            type="submit"
            disabled={!inputText.trim() || isGenerating}
            className="px-4 py-2.5 rounded-xl bg-[#2A2724] hover:bg-black text-[#FAF8F5] disabled:opacity-40 transition-colors flex items-center gap-1.5 text-xs font-medium"
            aria-label="Send to AI companion"
          >
            <Send className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Send</span>
          </button>
        </form>
      </div>
    </div>
  );
};
