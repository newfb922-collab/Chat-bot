import React, { useState, useRef, useEffect } from 'react';
import { Send, User, Bot, Sparkles, Plus, History, Command, Search, Archive, Brain, Trash2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { geminiService, Message, UserProfile } from './services/geminiService';
import { storage } from './lib/storage';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profile, setProfile] = useState<UserProfile>(storage.getProfile());
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initialize from storage
  useEffect(() => {
    const saved = storage.getMessages();
    if (saved.length > 0) setMessages(saved);
  }, []);

  // Persist messages
  useEffect(() => {
    storage.saveMessages(messages);
  }, [messages]);

  // Persist profile
  useEffect(() => {
    storage.saveProfile(profile);
  }, [profile]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    const assistantMessageId = (Date.now() + 1).toString();
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      const stream = geminiService.sendMessageStream(newMessages, profile);
      let fullContent = '';

      for await (const chunk of stream) {
        fullContent += chunk;
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, content: fullContent } 
              : msg
          )
        );
      }

      // After a successful exchange, extract memory if the conversation is long enough
      if (newMessages.length >= 2) {
        const updatedProfile = await geminiService.extractUserProfile([...newMessages, { ...assistantMessage, content: fullContent }], profile);
        if (updatedProfile) {
          setProfile(updatedProfile);
        }
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => 
        prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: "Error communicating with AI. Check your API key or connection." } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const startNewThread = () => {
    setMessages([]);
    setInput('');
  };

  const clearMemory = () => {
    if (confirm("Reset REHAN's memory and chat history?")) {
      storage.clearAll();
      setMessages([]);
      setProfile(storage.getProfile());
    }
  };

  return (
    <div className="flex h-screen bg-editorial-bg text-editorial-text-main font-sans overflow-hidden">
      {/* Editorial Sidebar */}
      <aside className="w-72 bg-editorial-sidebar border-r border-editorial-border hidden md:flex flex-col p-8 shrink-0">
        <div className="flex items-center justify-between mb-16">
          <div className="text-sm font-black tracking-[4px] text-editorial-accent select-none">
            REHAN AI
          </div>
          <button 
            onClick={clearMemory}
            className="text-editorial-text-dim hover:text-red-400 transition-colors p-1"
            title="Wipe Memory"
          >
            <Trash2 size={14} />
          </button>
        </div>
        
        <nav className="flex-1 space-y-10 overflow-y-auto scrollbar-editorial pr-2">
          {/* User Profile / Memory */}
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Brain size={14} className="text-editorial-accent" />
              <p className="text-[10px] uppercase tracking-[2px] text-editorial-text-dim font-semibold">
                Intelligence Memory
              </p>
            </div>
            <div className="bg-neutral-900/50 rounded p-4 border border-editorial-border space-y-4">
              <div>
                <p className="text-[9px] uppercase text-editorial-text-dim mb-1 tracking-tighter">Recognized User</p>
                <p className="text-xs font-medium text-editorial-accent">{profile.name}</p>
              </div>
              {profile.preferences.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase text-editorial-text-dim mb-1 tracking-tighter">Stated Preferences</p>
                  <div className="flex flex-wrap gap-1">
                    {profile.preferences.slice(-3).map((p, i) => (
                      <span key={i} className="text-[9px] bg-neutral-800 px-2 py-0.5 rounded text-editorial-text-dim border border-editorial-border">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {profile.topics.length > 0 && (
                <div>
                  <p className="text-[9px] uppercase text-editorial-text-dim mb-1 tracking-tighter">Active Focus</p>
                  <p className="text-[11px] text-editorial-text-main line-clamp-1">{profile.topics[profile.topics.length - 1]}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[10px] uppercase tracking-[2px] text-editorial-text-dim mb-6 font-semibold">
              Recent Threads
            </p>
            <div className="space-y-1">
              {[...new Set(profile.topics)].slice(-4).reverse().map((item, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "text-[13px] py-3 border-b border-editorial-border cursor-pointer transition-colors truncate text-editorial-text-dim hover:text-editorial-text-main"
                  )}
                  onClick={() => setInput(`Tell me more about ${item}`)}
                >
                  {item}
                </div>
              ))}
              {profile.topics.length === 0 && (
                <p className="text-[11px] text-neutral-600 italic">No history yet</p>
              )}
            </div>
          </div>
        </nav>

        <button 
          onClick={startNewThread}
          className="mt-8 border border-editorial-accent p-4 text-center text-[10px] uppercase tracking-[2px] font-bold hover:bg-editorial-accent hover:text-editorial-bg transition-all active:scale-95"
        >
          Initialize New Thread
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col relative overflow-hidden h-full">
        {/* Editorial Header */}
        <header className="px-8 md:px-20 py-10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-[12px] uppercase tracking-[1px] font-medium">
            <div className="w-2 h-2 bg-editorial-accent rounded-full animate-pulse" />
            <span className="text-editorial-text-dim">Model:</span>
            <span className="text-editorial-text-main">REHAN v1.5 [Superior]</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-editorial-text-dim hidden lg:block tracking-widest font-light">SYSTEM ONLINE</span>
            <div className="w-8 h-8 rounded-full bg-neutral-800 border border-editorial-border flex items-center justify-center text-[10px] font-bold tracking-tighter hover:bg-neutral-700 transition-colors cursor-pointer">
              {profile.name.substring(0, 2).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Chat Scroll Container */}
        <section className="flex-1 overflow-y-auto scrollbar-editorial px-8 md:px-20">
          <div className="max-w-[720px] mx-auto space-y-12 pb-48 pt-4">
            {messages.length === 0 ? (
              <div className="editorial-hero mt-12 md:mt-24 max-w-[600px]">
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="text-[48px] md:text-[72px] leading-[0.95] font-medium tracking-[-2px] mb-10"
                >
                  {profile.name !== 'User' ? `Greetings, ${profile.name}.` : 'REHAN AI CHAT BOT'}
                </motion.h1>
                <motion.p 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-base md:text-lg text-editorial-text-dim leading-relaxed mb-12 max-w-lg"
                >
                  REHAN AI CHAT BOT is your collaborative intelligence partner. Write, debug, or explore complex ideas with a refined editorial perspective.
                </motion.p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
                  {[
                    { label: "Creative", prompt: "Draft a concept for a luxury travel brand" },
                    { label: "Technical", prompt: "Refactor this React hook for better performance" },
                    { label: "Analytical", prompt: "Synthesize the key points of the latest market report" },
                    { label: "Exploration", prompt: "Teach me the fundamental principles of Bauhaus design" }
                  ].map((s, i) => (
                    <motion.button 
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 + i * 0.05 }}
                      onClick={() => setInput(s.prompt)}
                      className="text-left p-5 border border-editorial-border rounded-sm hover:bg-neutral-900 transition-all group"
                    >
                      <span className="block text-[10px] uppercase font-bold text-editorial-text-dim mb-2 group-hover:text-editorial-accent transition-colors">
                        {s.label}
                      </span>
                      <p className="text-[14px] leading-tight text-white group-hover:translate-x-1 transition-transform">{s.prompt}</p>
                    </motion.button>
                  ))}
                </div>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {messages.map((message) => (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className={cn(
                      "flex gap-8 group",
                      message.role === 'user' ? "flex-row-reverse" : "flex-row"
                    )}
                  >
                    <div className="shrink-0 flex flex-col items-center pt-1">
                      <div className={cn(
                        "w-6 h-6 border flex items-center justify-center text-[10px] transition-all",
                        message.role === 'user' 
                          ? "border-editorial-accent text-editorial-accent bg-transparent" 
                          : "border-transparent bg-editorial-accent text-black"
                      )}>
                        {message.role === 'user' ? <History size={12} /> : "A"}
                      </div>
                    </div>
                    
                    <div className={cn(
                      "flex-1 min-w-0 space-y-2",
                      message.role === 'user' ? "text-right" : "text-left"
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-invert prose-sm max-w-none text-editorial-text-main selection:bg-editorial-accent/30">
                          <ReactMarkdown 
                            remarkPlugins={[remarkGfm]}
                            components={{
                              code({ node, inline, className, children, ...props }: any) {
                                const match = /language-(\w+)/.exec(className || '');
                                return !inline && match ? (
                                  <SyntaxHighlighter
                                    style={vscDarkPlus}
                                    language={match[1]}
                                    PreTag="div"
                                    className="rounded-lg my-6 text-[13px] border border-editorial-border"
                                    {...props}
                                  >
                                    {String(children).replace(/\n$/, '')}
                                  </SyntaxHighlighter>
                                ) : (
                                  <code className={cn("bg-neutral-900 px-1.5 py-0.5 rounded text-editorial-accent font-mono text-[13px]", className)} {...props}>
                                    {children}
                                  </code>
                                );
                              }
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-editorial-text-main text-lg font-light leading-relaxed tracking-tight whitespace-pre-wrap">
                          {message.content}
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
            <div ref={messagesEndRef} />
          </div>
        </section>

        {/* Editorial Floating Input */}
        <footer className="absolute bottom-12 left-0 right-0 px-8 md:px-20 z-20 pointer-events-none">
          <div className="max-w-[720px] mx-auto pointer-events-auto">
            <form 
              onSubmit={handleSend}
              className="bg-editorial-input border border-editorial-border rounded-xl p-4 flex items-center gap-4 focus-within:border-editorial-accent focus-within:ring-4 focus-within:ring-white/10 transition-all shadow-[0_32px_64px_-16px_rgba(0,0,0,0.8)]"
            >
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask REHAN something..."
                className="flex-1 bg-transparent border-none focus:outline-none text-[16px] text-editorial-text-main placeholder:text-neutral-700 resize-none py-1 scrollbar-none"
                disabled={isLoading}
              />
              <div className="flex items-center gap-4">
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-12 h-12 flex items-center justify-center rounded-lg bg-editorial-accent text-editorial-bg disabled:bg-neutral-800 disabled:text-neutral-500 transition-all active:scale-90 hover:shadow-[0_0_20px_rgba(255,255,255,0.2)]"
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  ) : (
                    <Send size={20} fill="currentColor" />
                  )}
                </button>
              </div>
            </form>
          </div>
        </footer>
      </main>
    </div>
  );
}


