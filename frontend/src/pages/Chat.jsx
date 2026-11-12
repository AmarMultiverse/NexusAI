import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, LogOut, LogIn, Loader2, Plus, MessageSquare, Edit2, Check, X, Trash2, Download, Copy, Mic, MicOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import toast from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'https://nexusai-backend-966g.onrender.com';
const GUEST_STORAGE_KEY = 'nexus_guest_messages';

// Helper function to clean raw <br> tags and fix single-line markdown tables
const formatAiMarkdown = (rawText) => {
  if (!rawText) return '';
  return rawText
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/\|\s*\|\s*(?=[A-Za-z0-9#*])/g, '|\n| ');
};

const Chat = () => {
  const { user, logout, token } = useAuthStore();
  const navigate = useNavigate();

  // --- 1. ALL STATES ---
  // Initialize messages from localStorage if in Guest Mode so temporary chats persist across navigation
  const [messages, setMessages] = useState(() => {
    if (!useAuthStore.getState().user) {
      try {
        const savedGuest = localStorage.getItem(GUEST_STORAGE_KEY);
        return savedGuest ? JSON.parse(savedGuest) : [];
      } catch {
        return [];
      }
    }
    return [];
  });

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [isListening, setIsListening] = useState(false);
  
  const [currentSessionId, setCurrentSessionId] = useState(localStorage.getItem('currentSessionId') || null);
  const [selectedModel, setSelectedModel] = useState("openai/gpt-oss-120b");
  const [editingSessionId, setEditingSessionId] = useState(null);
  const [editTitle, setEditTitle] = useState("");

  // --- 2. REFS ---
  const messagesEndRef = useRef(null);
  const isStreaming = useRef(false);
  const isSyncingGuest = useRef(false);
  const recognitionRef = useRef(null);

  // --- 3. USE EFFECTS ---

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Persist Guest Mode messages in localStorage automatically whenever they change
  useEffect(() => {
    if (!user) {
      if (messages.length > 0) {
        localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(messages));
      } else {
        localStorage.removeItem(GUEST_STORAGE_KEY);
      }
    }
  }, [messages, user]);

  // Save/delete currentSessionId in persistent storage for logged-in users
  useEffect(() => {
    if (user && currentSessionId) {
      localStorage.setItem('currentSessionId', currentSessionId);
    } else if (!user) {
      localStorage.removeItem('currentSessionId');
    }
  }, [currentSessionId, user]);

  // Fetch all sessions for the sidebar (Only when logged in)
  const fetchSessions = async () => {
    if (!user || !token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/chat/sessions`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (error) {
      console.error("Sessions fetch error:", error);
    }
  };

  // Automatically sync Guest Mode chat into MongoDB when a Guest logs in or signs up
  useEffect(() => {
    const syncAndLoadUserSessions = async () => {
      if (!user || !token) {
        setSessions([]);
        setCurrentSessionId(null);
        return;
      }

      const savedGuestRaw = localStorage.getItem(GUEST_STORAGE_KEY);
      if (savedGuestRaw && !isSyncingGuest.current) {
        try {
          const guestMessages = JSON.parse(savedGuestRaw);
          if (Array.isArray(guestMessages) && guestMessages.length > 0) {
            isSyncingGuest.current = true;
            const res = await fetch(`${API_BASE_URL}/api/chat/sync-guest`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({ guestMessages })
            });

            if (res.ok) {
              const data = await res.json();
              localStorage.removeItem(GUEST_STORAGE_KEY);
              setCurrentSessionId(data.sessionId);
              setMessages(guestMessages);
              toast.success("Your temporary guest chat has been saved to your account!");
            }
          }
        } catch (err) {
          console.error("Failed to sync guest messages:", err);
        } finally {
          isSyncingGuest.current = false;
        }
      }

      await fetchSessions();
    };

    syncAndLoadUserSessions();
  }, [user, token]);

  // Fetch previous chat messages when selecting a session from the sidebar
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (isStreaming.current || isSyncingGuest.current) return;

      if (!user || !token) return;

      if (!currentSessionId) {
        setMessages([]);
        return;
      }

      try {
        const res = await fetch(`${API_BASE_URL}/api/chat/history/${currentSessionId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const pastMessages = await res.json();
          const formatted = pastMessages.map((msg) => ({
            text: msg.text,
            sender: msg.role
          }));
          setMessages(formatted);
        }
      } catch (error) {
        console.error("History fetch error:", error);
      }
    };
    fetchChatHistory();
  }, [currentSessionId, token, user]);

  // --- 4. HANDLER FUNCTIONS ---

  const handleLogout = () => {
    logout();
    localStorage.removeItem('currentSessionId');
    localStorage.removeItem(GUEST_STORAGE_KEY);
    setSessions([]);
    setCurrentSessionId(null);
    setMessages([]);
    toast.success("Logged out! You are now in Guest Mode.");
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
    if (!user) {
      localStorage.removeItem(GUEST_STORAGE_KEY);
    }
  };

  const handleRename = async (id) => {
    if (!editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title: editTitle })
      });

      if (response.ok) {
        setEditingSessionId(null);
        fetchSessions();
        toast.success("Chat renamed successfully!"); 
      } else {
        const data = await response.json();
        toast.error(data.message || "Rename failed.");
      }
    } catch (error) {
      console.error("Rename network error:", error);
      toast.error("Network error, check backend console.");
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    
    const confirmDelete = window.confirm("Are you sure you want to delete this chat?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Chat deleted successfully!");
        if (currentSessionId === id) {
          setCurrentSessionId(null);
          setMessages([]);
        }
        fetchSessions();
      } else {
        toast.error("Delete failed.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Network error.");
    }
  };

  const handleExportChat = () => {
    if (messages.length === 0) {
      toast.error("Cannot export an empty chat!");
      return;
    }

    let chatText = `# NexusAI Chat Export\n\n`;
    messages.forEach((msg) => {
      const role = msg.sender === 'user' ? 'You' : 'NexusAI';
      chatText += `### ${role}:\n${msg.text}\n\n---\n\n`;
    });

    const blob = new Blob([chatText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NexusAI-Export.md';
    document.body.appendChild(a);
    a.click();
    
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Chat downloaded successfully!");
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
    toast.success("Copied to clipboard!");
  };

  const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Your browser does not support voice input. Please use Chrome.");
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.lang = 'en-IN';
    recognition.interimResults = false; 
    
    recognition.onstart = () => {
      setIsListening(true);
      toast.success("Listening... Speak now!");
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput((prev) => prev + (prev ? " " : "") + transcript);
    };

    recognition.onerror = (event) => {
      console.error("Speech Error:", event.error);
      if (event.error === 'not-allowed') {
        toast.error("Microphone permission denied!");
      } else if (event.error !== 'aborted') {
        toast.error("Something went wrong with the microphone!");
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    isStreaming.current = true;

    const previousMessagesSnapshot = [...messages];
    const userMessage = { text: input, sender: 'user' };
    
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setMessages((prev) => [...prev, { text: '', sender: 'ai' }]);

    try {
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(`${API_BASE_URL}/api/chat/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: userMessage.text,
          sessionId: user ? currentSessionId : null,
          aiModel: selectedModel,
          guestHistory: !user ? previousMessagesSnapshot : undefined
        })
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server responded with status ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        // Keep the last partial chunk in buffer until the next read
        buffer = events.pop() || '';
        
        for (const eventStr of events) {
          const line = eventStr.trim();
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') break;
            
            try {
              const data = JSON.parse(dataStr);
              
              if (data.sessionId && !currentSessionId && user) {
                setCurrentSessionId(data.sessionId);
                fetchSessions();
              } else if (data.text) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    text: newMessages[lastIndex].text + data.text
                  };
                  return newMessages;
                });
              } else if (data.error) {
                toast.error(data.error);
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    text: `⚠️ ${data.error}`
                  };
                  return newMessages;
                });
              }
            } catch (err) {
              console.error('Streaming JSON chunk error:', err);
            }
          }
        }
      }
    } catch (error) {
      console.error('Chat generation error:', error);
      toast.error("Failed to get response from server.");
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastIndex = newMessages.length - 1;
        if (newMessages[lastIndex]?.sender === 'ai' && newMessages[lastIndex]?.text === '') {
          newMessages[lastIndex] = {
            ...newMessages[lastIndex],
            text: "⚠️ Unable to reach the AI server. If the backend was idle, please wait 15 seconds and try again."
          };
        }
        return newMessages;
      });
    } finally {
      setIsTyping(false);
      isStreaming.current = false;
    }
  };

  // --- 5. THE MAIN LAYOUT (UI) ---
  return (
    <div className="flex h-screen bg-gray-950 text-white overflow-hidden">
      
      {/* SIDEBAR COMPONENT */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col hidden md:flex">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-blue-500 mb-6 flex items-center gap-2">
            <Bot className="w-8 h-8" /> NexusAI
          </h1>
          <button 
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> New Chat
          </button>
        </div>

        {/* Dynamic Sessions Title List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <p className="text-xs text-gray-500 font-semibold px-2 mb-2 uppercase">Recent Chats</p>
          {!user ? (
            <div className="px-3 py-4 text-xs text-gray-400 bg-gray-800/40 rounded-lg border border-gray-800 space-y-2">
              <p className="font-medium text-gray-300">Guest Session Active</p>
              <p>Your current chat stays saved in your browser! Sign in anytime to permanently sync it to your account.</p>
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-xs text-gray-500 px-2">No saved chats yet.</p>
          ) : (
            sessions.map((session) => (
              <div 
                key={session._id} 
                className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                  currentSessionId === session._id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
                }`}
              >
                {editingSessionId === session._id ? (
                  <div className="flex items-center gap-2 w-full">
                    <input 
                      type="text" 
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(session._id);
                      }}
                      className="flex-1 bg-gray-900 text-white px-2 py-1 rounded text-sm outline-none border border-gray-700"
                      autoFocus
                    />
                    <button onClick={() => handleRename(session._id)} className="text-green-500 hover:text-green-400"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingSessionId(null)} className="text-red-500 hover:text-red-400"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setCurrentSessionId(session._id)} className="flex-1 text-left flex items-center gap-3 truncate">
                      <MessageSquare className="w-4 h-4 shrink-0" />
                      <span className="truncate text-sm">{session.title}</span>
                    </button>
                    
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingSessionId(session._id); setEditTitle(session.title); }} 
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                        title="Rename Chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      
                      <button 
                        onClick={(e) => handleDelete(session._id, e)} 
                        className="p-1 hover:bg-red-900/50 rounded text-gray-400 hover:text-red-500 transition-colors"
                        title="Delete Chat"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        {/* Profile Info Row & Login / Logout */}
        <div className="p-4 border-t border-gray-800 space-y-3">
          {user ? (
            <>
              <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-lg">
                <div className="bg-blue-600 p-2 rounded-full shrink-0">
                  <User className="w-5 h-5 text-white" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-sm truncate">{user?.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user?.email}</p>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="flex items-center justify-center gap-2 text-gray-400 hover:text-red-400 w-full p-2 transition-colors text-sm font-medium"
              >
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-3 bg-gray-800/60 p-3 rounded-lg">
                <div className="bg-gray-700 p-2 rounded-full shrink-0">
                  <User className="w-5 h-5 text-gray-300" />
                </div>
                <div className="overflow-hidden">
                  <p className="font-medium text-sm text-gray-200 truncate">Guest Mode</p>
                  <p className="text-xs text-gray-400 truncate">Auto-Saved Locally</p>
                </div>
              </div>
              <button 
                onClick={() => navigate('/login')}
                className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white w-full py-2 px-4 rounded-lg transition-colors text-sm font-medium"
              >
                <LogIn className="w-4 h-4" /> Sign In to Save Chats
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CHAT WINDOW */}
      <div className="flex-1 flex flex-col">
        {/* Mobile View Header */}
        <div className="md:hidden bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-500 flex items-center gap-2">
            <Bot className="w-6 h-6" /> NexusAI
          </h1>
          <div className="flex items-center gap-2">
            <button onClick={handleNewChat} className="text-gray-400 p-2" title="New Chat">
              <Plus className="w-5 h-5" />
            </button>
            {!user && (
              <button
                onClick={() => navigate('/login')}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-md font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Messages Screen Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <Bot className="w-16 h-16 opacity-50" />
              <h2 className="text-2xl font-semibold text-gray-300">How can I help you today?</h2>
              <p className="text-sm text-center max-w-md">
                {user 
                  ? "Start a new conversation or pick from your saved history!" 
                  : "You are chatting in instant Guest Mode. Ask anything—if you sign in later, this chat will automatically sync to your account!"}
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex gap-4 max-w-4xl mx-auto ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className={`relative group p-4 rounded-2xl max-w-[85%] overflow-x-auto ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                  
                  {msg.sender === 'ai' && !isTyping && msg.text !== '' && (
                    <button
                      onClick={() => handleCopy(msg.text, index)}
                      className="absolute right-2 top-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700/90 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white z-10"
                      title="Copy Message"
                    >
                      {copiedIndex === index ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  )}

                  {msg.sender === 'ai' && msg.text === '' && isTyping ? (
                    <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
                  ) : (
                    <div className="prose prose-invert max-w-none text-gray-100 text-sm md:text-base leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          table({ children }) {
                            return (
                              <div className="overflow-x-auto my-4 rounded-lg border border-gray-700">
                                <table className="min-w-full divide-y divide-gray-700 text-left text-sm">
                                  {children}
                                </table>
                              </div>
                            );
                          },
                          thead({ children }) {
                            return <thead className="bg-gray-900/80 text-gray-200 font-semibold">{children}</thead>;
                          },
                          th({ children }) {
                            return <th className="px-4 py-2.5 border-b border-gray-700">{children}</th>;
                          },
                          td({ children }) {
                            return <td className="px-4 py-2 border-b border-gray-800 text-gray-300 align-top">{children}</td>;
                          },
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={vscDarkPlus}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-md my-2 text-sm"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code className="bg-gray-900 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                {children}
                              </code>
                            );
                          }
                        }}
                      >
                        {formatAiMarkdown(msg.text)}
                      </ReactMarkdown>
                    </div>
                  )}
                </div>
                {msg.sender === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center shrink-0 mt-1">
                    <User className="w-5 h-5 text-gray-300" />
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* CHAT INPUT AREA BOX */}
        <div className="p-4 bg-gray-900 border-t border-gray-800">
          
          {/* Dynamic AI Brain Model Selector Placement */}
          <div className="max-w-4xl mx-auto mb-3 flex items-center justify-between gap-2">
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-800 text-xs text-gray-300 border border-gray-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
              disabled={isTyping}
            >
              <option value="openai/gpt-oss-120b">NexusAI GPT-OSS 120B (Flagship Reasoning)</option>
              <option value="openai/gpt-oss-20b">NexusAI GPT-OSS 20B (Ultra-Fast 1000 T/s)</option>
              <option value="qwen/qwen3.8-27b">NexusAI Qwen 3.8 27B (Coding & Logic)</option>
            </select>

            <button
              onClick={handleExportChat}
              disabled={messages.length === 0 || isTyping}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs px-3 py-1.5 border border-gray-700 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Download Chat History"
            >
              <Download className="w-3 h-3" />
              <span className="hidden sm:inline">Export Chat</span>
            </button>
          </div>

          <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative flex items-center">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message NexusAI..."
              className="w-full bg-gray-800 text-white border border-gray-700 rounded-full py-4 pl-6 pr-28 focus:outline-none focus:border-blue-500 transition-colors text-sm md:text-base"
              disabled={isTyping}
            />
            
            <button
              type="button"
              onClick={handleVoiceInput}
              disabled={isTyping}
              className={`absolute right-14 top-1/2 transform -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
              } disabled:opacity-50`}
              title="Voice Input"
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            <button
              type="submit"
              disabled={isTyping || !input.trim()}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-full flex items-center justify-center text-white transition-colors"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
        
      </div>
    </div>
  );
};

export default Chat;