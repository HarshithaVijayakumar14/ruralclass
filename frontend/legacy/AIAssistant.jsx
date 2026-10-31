import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Mic, 
  MicOff, 
  Volume2, 
  Sparkles, 
  BookmarkPlus, 
  AlertCircle,
  CheckCircle2,
  HelpCircle
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { chatWithAIAssistant } from '../lib/api';

export const AIAssistant = ({ activeClassroom }) => {
  const { t, i18n } = useTranslation();
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Namaste! I am your RuralClass Teaching Companion. I help you design zero-cost slate activities, resolve classroom multi-grade rotation bottlenecks, and simplify difficult concepts for Grades 1–8. How can I assist you today?'
    }
  ]);
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend) => {
    const query = textToSend || input;
    if (!query.trim()) return;

    const userMessage = { role: 'user', content: query.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput('');
    setLoading(true);

    try {
      const res = await chatWithAIAssistant(
        updatedMessages,
        activeClassroom ? {
          school_name: activeClassroom.school_name,
          grades: activeClassroom.grades,
          subjects: activeClassroom.subjects
        } : null,
        i18n.language || 'en'
      );

      const reply = res.reply || 'Here is a practical suggestion for your multi-grade class.';
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      console.warn('[AI Assistant] API call failed, using rule-based fallback:', err.message);
      let reply = `Here is a practical multi-grade suggestion:\n\n` +
        `• Direct Focus (Teacher-Led): Work with one grade at the chalkboard for 12–15 minutes.\n` +
        `• Simultaneous Slate Practice: Have other grades work in pairs with tamarind seeds or on slates.\n` +
        `• Bell Cue: Ring the transition bell 2 minutes before rotating.`;
      setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPrompt = (promptText) => {
    handleSend(promptText);
  };

  // Web Speech API Voice synthesis (Read Aloud)
  const handleReadAloud = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = i18n.language === 'kn' ? 'kn-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Speech synthesis is not supported in this browser.');
    }
  };

  // Web Speech API Speech-to-Text
  const handleToggleVoice = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = i18n.language === 'kn' ? 'kn-IN' : i18n.language === 'hi' ? 'hi-IN' : 'en-IN';
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = () => setIsListening(false);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
        }
      };

      recognition.start();
    } catch (e) {
      setIsListening(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
          <Bot className="w-6 h-6 text-[#2E7D32]" />
          <span>AI Multi-Grade Teaching Companion</span>
        </h1>
        <p className="text-xs text-stone-500">
          Instant pedagogical advice, slate activity ideas, and classroom rotation assistance
        </p>
      </div>

      {/* Quick Action Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <button
          onClick={() => handleQuickPrompt('Suggest a 15-minute zero-cost math activity for Grades 2 and 4.')}
          className="px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-[#2E7D32] hover:text-[#2E7D32] text-stone-700 whitespace-nowrap shadow-xs transition-colors"
        >
          💡 Math activity with pebbles
        </button>
        <button
          onClick={() => handleQuickPrompt('How do I manage noise while Grade 4 is doing independent slate work?')}
          className="px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-[#2E7D32] hover:text-[#2E7D32] text-stone-700 whitespace-nowrap shadow-xs transition-colors"
        >
          🤫 Classroom noise management
        </button>
        <button
          onClick={() => handleQuickPrompt('Give me a 3-question formative slate check on plant leaves.')}
          className="px-3 py-1.5 rounded-full bg-white border border-stone-200 hover:border-[#2E7D32] hover:text-[#2E7D32] text-stone-700 whitespace-nowrap shadow-xs transition-colors"
        >
          📝 3-question slate quiz
        </button>
      </div>

      {/* Chat Container */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-sm flex flex-col h-[520px]">
        
        {/* Messages Scroll Area */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div 
              key={idx}
              className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 text-white ${
                msg.role === 'user' ? 'bg-stone-700' : 'bg-[#2E7D32]'
              }`}>
                {msg.role === 'user' ? <span className="text-xs font-bold">You</span> : <Bot className="w-5 h-5" />}
              </div>

              <div className={`max-w-[80%] rounded-2xl p-4 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#2E7D32] text-white shadow-xs'
                  : 'bg-stone-50 border border-stone-200 text-stone-800'
              }`}>
                <div className="whitespace-pre-line">{msg.content}</div>

                {msg.role === 'assistant' && (
                  <div className="pt-2 mt-2 border-t border-stone-200 flex items-center justify-end gap-2 text-stone-400">
                    <button
                      type="button"
                      onClick={() => handleReadAloud(msg.content)}
                      className="hover:text-stone-700 transition-colors"
                      title="Read aloud"
                      aria-label="Read aloud"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-stone-400 animate-pulse pl-11">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span>Thinking pedagogically...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-stone-50 border-t border-stone-200 rounded-b-2xl">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }} 
            className="flex items-center gap-2"
          >
            <button
              type="button"
              onClick={handleToggleVoice}
              className={`p-2.5 rounded-xl transition-colors ${
                isListening ? 'bg-red-500 text-white animate-pulse' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
              title="Voice Input (Speech-to-Text)"
              aria-label="Voice Input"
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask for an activity, transition tip, or concept explanation..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-xs bg-white focus:outline-none focus:border-[#2E7D32]"
            />

            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2.5 rounded-xl bg-[#2E7D32] hover:bg-[#1B5E20] text-white transition-colors disabled:opacity-50 shadow-xs"
              title="Send Message"
              aria-label="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>

      </div>

    </div>
  );
};
