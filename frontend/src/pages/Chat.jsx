import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Send, Bot, User, LogOut, Loader2, Plus, MessageSquare, Edit2, Check, X, Trash2, Download, Copy, Mic, MicOff } from 'lucide-react';
import { useAuthStore } from '../store/useAuthStore';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'; // This provides a VS Code-like dark theme
import toast from 'react-hot-toast'; // Imported toast for popups

const Chat = () => {
  // --- 1. ALL STATES (Variables) ---
  const [messages, setMessages] = useState([]); // For chat screen messages
  const [input, setInput] = useState(''); // For text field input
  const [isTyping, setIsTyping] = useState(false); // AI loading spinner tracker
  const [sessions, setSessions] = useState([]); // List of all chat rooms (sessions) in the sidebar
  const [copiedIndex, setCopiedIndex] = useState(null); // Tracks which message was copied
  const [isListening, setIsListening] = useState(false); // Tracks if the mic is on or off
  
  // Checking localStorage to remember the current chat room on refresh
  const [currentSessionId, setCurrentSessionId] = useState(localStorage.getItem('currentSessionId') || null);
  
  const [selectedModel, setSelectedModel] = useState("llama-3.1-8b-instant"); // Selected AI Model
  const [editingSessionId, setEditingSessionId] = useState(null); // ID of the session being renamed
  const [editTitle, setEditTitle] = useState(""); // The text being typed in the input during rename

  // --- 2. REFS & CENTRAL STORE ---
  const { user, logout, token } = useAuthStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null); // Bottom of the screen for auto-scroll
  const isStreaming = useRef(false); // Stream tracker to prevent race conditions
  const recognitionRef = useRef(null); // To remember the active mic instance

  // --- 3. USE EFFECTS (Automations) ---

  // Auto Scroll: Screen scrolls down when a new message arrives
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  // Security Check: Redirect to Login page if token/user is missing
  useEffect(() => { if (!user) navigate('/login'); }, [user, navigate]);

  // Refresh Fix: Save/delete currentSessionId in persistent storage whenever it changes
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem('currentSessionId', currentSessionId);
    } else {
      localStorage.removeItem('currentSessionId');
    }
  }, [currentSessionId]);

  // Sidebar Load: Fetch all sessions (titles) from the backend on page load
  const fetchSessions = async () => {
    try {
      const res = await fetch('https://nexusai-backend-966g.onrender.com/api/chat/sessions', {
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
  useEffect(() => {
    if (user && token) fetchSessions();
  }, [user, token]);

  // History Load: Fetch previous chat from the database when the user selects a different room from the sidebar
  useEffect(() => {
    const fetchChatHistory = async () => {
      if (isStreaming.current) return; // Do not fetch if the AI is currently typing

      if (!currentSessionId) {
        setMessages([]); // Clear the screen if it's a new chat
        return;
      }
      try {
        const res = await fetch(`https://nexusai-backend-966g.onrender.com/api/chat/history/${currentSessionId}`, {
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
  }, [currentSessionId, token]);


  // --- 4. INDEPENDENT HANDLER FUNCTIONS ---

  const handleLogout = () => {
    logout();
    localStorage.removeItem('currentSessionId');
    navigate('/login');
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([]);
  };

  // REWRITE & FIX: handleRename function is defined separately here (not nested)
  const handleRename = async (id) => {
    if (!editTitle.trim()) {
      setEditingSessionId(null);
      return;
    }
    try {
      // Inside handleRename -> separate try block added for backend request
      const response = await fetch(`https://nexusai-backend-966g.onrender.com/api/chat/sessions/${id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ title: editTitle })
      });

      if (response.ok) {
        setEditingSessionId(null);
        fetchSessions(); // Refresh sidebar so the new name appears immediately
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

  // FOR DELETING CHATS 
  const handleDelete = async (id, e) => {
    e.stopPropagation(); // Prevents row click to avoid opening another chat
    
    const confirmDelete = window.confirm("Are you sure you want to delete this chat?");
    if (!confirmDelete) return;

    try {
      const response = await fetch(`https://nexusai-backend-966g.onrender.com/api/chat/sessions/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        toast.success("Chat deleted successfully!");
        
        // If the deleted chat is currently open, clear the screen
        if (currentSessionId === id) {
          setCurrentSessionId(null);
          setMessages([]);
        }
        fetchSessions(); // Refresh sidebar
      } else {
        toast.error("Delete failed.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Network error.");
    }
  };

  // FOR DOWNLOADING CHATS
  const handleExportChat = () => {
    if (messages.length === 0) {
      toast.error("Cannot export an empty chat!");
      return;
    }

    // 1. Convert messages to a clean text/markdown format
    let chatText = `# NexusAI Chat Export\n\n`;
    messages.forEach((msg) => {
      const role = msg.sender === 'user' ? 'You' : 'NexusAI';
      chatText += `### ${role}:\n${msg.text}\n\n---\n\n`;
    });

    // 2. Use a Blob to convert the text into an .md file
    const blob = new Blob([chatText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    
    // 3. Create a temporary link to trigger the file download
    const a = document.createElement('a');
    a.href = url;
    a.download = 'NexusAI-Export.md';
    document.body.appendChild(a);
    a.click();
    
    // 4. Clean up memory
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Chat downloaded successfully!");
  };

  // FOR COPYING CHATS
  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text); // Copies text to the clipboard
    setCopiedIndex(index); // To show the green tick
    setTimeout(() => setCopiedIndex(null), 2000); // The copy icon will return after 2 seconds
    toast.success("Copied to clipboard!");
  };

  // VOICE TO TEXT conversion using MIC
const handleVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      toast.error("Your browser does not support voice input. Please use Chrome.");
      return;
    }

    // 🔥 CHANGE 1: If the mic is already running, STOP it and exit
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop(); // This will stop the active mic
      }
      return;
    }

    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition; // Saved mic control in Ref
    
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

    // 🔥 CHANGE 2: Filtered errors to avoid displaying incorrect messages
    recognition.onerror = (event) => {
      console.error("Speech Error:", event.error);
      
      // 'aborted' occurs when the mic is manually stopped, do not treat it as an error
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

    isStreaming.current = true; // Applied stream lock

    const userMessage = { text: input, sender: 'user' };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setMessages((prev) => [...prev, { text: '', sender: 'ai' }]); // Inserted an empty AI bubble

    try {
      const response = await fetch('https://nexusai-backend-966g.onrender.com/api/chat/generate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ prompt: userMessage.text, sessionId: currentSessionId, aiModel: selectedModel })
      });

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.replace('data: ', '');
            if (dataStr === '[DONE]') break;
            
            try {
              const data = JSON.parse(dataStr);
              
              // Check the first ID of the new session
              if (data.sessionId && !currentSessionId) {
                setCurrentSessionId(data.sessionId);
                fetchSessions();
              } 
              // Immutability Fix: Creating a new object to prevent stuttering
              else if (data.text) {
                setMessages((prev) => {
                  const newMessages = [...prev];
                  const lastIndex = newMessages.length - 1;
                  newMessages[lastIndex] = {
                    ...newMessages[lastIndex],
                    text: newMessages[lastIndex].text + data.text
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
    } finally {
      setIsTyping(false);
      isStreaming.current = false; // Released stream lock
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
          {sessions.map((session) => (
            <div 
              key={session._id} 
              className={`group flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                currentSessionId === session._id ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`}
            >
              {/* Check Condition: Are we renaming this specific row? */}
              {editingSessionId === session._id ? (
                <div className="flex items-center gap-2 w-full">
                  <input 
                    type="text" 
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(session._id); // Enter key support added
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
                  
                  {/* Action Buttons: Visible on hover */}
                  <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      {/* Rename Button */}
                      <button 
                        onClick={(e) => { e.stopPropagation(); setEditingSessionId(session._id); setEditTitle(session.title); }} 
                        className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                        title="Rename Chat"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      
                      {/* Delete Button */}
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
          ))}
        </div>

        {/* Profile Info Row & Logout */}
        <div className="p-4 border-t border-gray-800 space-y-4">
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
        </div>
      </div>

      {/* MAIN CHAT WINDOW */}
      <div className="flex-1 flex flex-col">
        {/* Mobile View Header */}
        <div className="md:hidden bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-blue-500 flex items-center gap-2">
            <Bot className="w-6 h-6" /> NexusAI
          </h1>
          <button onClick={handleNewChat} className="text-gray-400 p-2">
            <Plus className="w-6 h-6" />
          </button>
        </div>

        {/* Messages Screen Container */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <Bot className="w-16 h-16 opacity-50" />
              <h2 className="text-2xl font-semibold">How can I help you today?</h2>
              <p className="text-sm">Start a new conversation or pick from history!</p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <div key={index} className={`flex gap-4 max-w-4xl mx-auto ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center shrink-0 mt-1">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                )}
                {/* NEW: Added 'relative' and 'group' here */}
                <div className={`relative group p-4 rounded-2xl max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-200 rounded-tl-none'}`}>
                  
                  {/* NEW: Copy Button will only appear on AI messages */}
                  {msg.sender === 'ai' && !isTyping && msg.text !== '' && (
                    <button
                      onClick={() => handleCopy(msg.text, index)}
                      className="absolute -right-10 top-2 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-700 hover:bg-gray-600 rounded-md text-gray-300 hover:text-white"
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
                          components={{
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
                                <code className="bg-gray-800 text-blue-400 px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                                  {children}
                                </code>
                              );
                            }
                          }}
                        >
                        {msg.text}
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
          <div className="max-w-4xl mx-auto mb-3 flex gap-2">
            <select 
              value={selectedModel} 
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-gray-800 text-xs text-gray-400 border border-gray-700 rounded-md px-3 py-1.5 focus:outline-none focus:border-blue-500 cursor-pointer"
              disabled={isTyping}
            >
              {/* Llama 3.1 - Fastest and Most Stable */}
              <option value="llama-3.1-8b-instant">NexusAI 3.1 Pro (Fastest)</option>
              
              {/* NEW: Replaced Gemma with GPT-OSS 20B (Very powerful) */}
              <option value="openai/gpt-oss-20b">NexusAI GPT OSS (Advanced Chat)</option>
              
              {/* NEW: Replaced Mixtral with Llama 3.3 70B (For Heavy Logic) */}
              <option value="llama-3.3-70b-versatile">NexusAI 3.3 (Complex Logic)</option>
            </select>

            {/* NEW: Download Chat Button */}
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
            
            {/* NEW: Mic Button */}
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

            {/* Send Button */}
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