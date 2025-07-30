import React, { useState, useRef, useEffect } from 'react';
import { Send, X } from 'lucide-react';
import { useMessages } from '../hooks/useFirestore';
import { useCountdown } from '../hooks/useCountdown';

interface Message {
  id: string;
  name: string;
  question: string;
  reply?: string;
  timestamp: number;
  isFromStuart: boolean;
  read: boolean;
}

const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [hasSetName, setHasSetName] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { messages, loading, error, addMessage } = useMessages();
  const countdown = useCountdown(new Date('2025-07-14T00:00:00'));

  // Character limit for questions
  const MAX_QUESTION_LENGTH = 100;
  const remainingChars = MAX_QUESTION_LENGTH - message.length;

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasSetName && name.trim()) {
      setHasSetName(true);
      return;
    }

    if (message.trim() && hasSetName) {
      // Client-side validation
      if (message.length > MAX_QUESTION_LENGTH) {
        alert(`Question must be ${MAX_QUESTION_LENGTH} characters or less. Current: ${message.length} characters.`);
        return;
      }

      setIsLoading(true);
      try {
        await addMessage(name, message);
        setMessage('');
      } catch (error) {
        console.error('Error sending message:', error);
        alert('Error sending message. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleMessageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setMessage(value);
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    setShowTooltip(false);
  };

  const handleMouseEnter = () => {
    if (!isOpen) {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
      setShowTooltip(true);
    }
  };

  const handleMouseLeave = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setShowTooltip(false);
    }, 150);
  };

  const handleTooltipMouseEnter = () => {
    if (tooltipTimeoutRef.current) {
      clearTimeout(tooltipTimeoutRef.current);
    }
  };

  const handleTooltipMouseLeave = () => {
    setShowTooltip(false);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (tooltipTimeoutRef.current) {
        clearTimeout(tooltipTimeoutRef.current);
      }
    };
  }, []);

  // Filter messages for current conversation (by name)
  const currentConversation = messages.filter(msg => 
    msg.name.toLowerCase() === name.toLowerCase()
  );

  if (error) {
    console.error('Firebase error:', error);
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Prominent Service Launch Countdown */}
      {!countdown.isLive && (
        <div className="absolute -top-64 left-1/2 transform -translate-x-1/2 z-[1000000] mb-4 pointer-events-none">
          <div className="bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 text-white px-4 py-3 rounded-full shadow-lg animate-bounce pointer-events-auto min-w-[140px]">
            <div className="text-center">
              <div className="text-xs font-bold">GOING LIVE!</div>
              <div className="text-sm font-mono font-black mt-1">
                {countdown.days}d {countdown.hours}h {countdown.minutes}m
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Hover Tooltip */}
      {showTooltip && !isOpen && (
        <div 
          className="absolute -top-56 right-0 z-[999995] mb-2"
          onMouseEnter={handleTooltipMouseEnter}
          onMouseLeave={handleTooltipMouseLeave}
        >
          <div className="bg-black text-white px-4 py-3 rounded-lg shadow-xl text-sm w-64 mr-52">
            <div className="text-center leading-tight">
              Are you a Lawyer or Legal Assistant
              <br />
              with a question?
            </div>
          </div>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-80 h-[480px] bg-white rounded-lg shadow-2xl border border-gray-200 flex flex-col animate-in slide-in-from-bottom-2 duration-300 z-[999998]">
          {/* Header - Black background */}
          <div className="bg-black text-white p-4 rounded-t-lg flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="https://images.squarespace-cdn.com/content/v1/65d407ca959c8d393d5dc2e0/6273bfbd-7377-495b-89c0-4fa96a195b10/SH.png?format=1000w"
                alt="Stuart"
                className="w-10 h-10 rounded-full object-cover border-2 border-gray-300"
              />
              <div>
                <h3 className="font-semibold text-sm">Lawyers - Ask Stuart</h3>
                <p className="text-xs text-gray-300">Specialist Family Law Property Valuer</p>
              </div>
            </div>
            <button 
              onClick={toggleChat}
              className="text-gray-300 hover:text-white transition-colors p-1"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3">
            {loading && (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600">Connecting...</p>
              </div>
            )}
            
            {error && (
              <div className="bg-red-50 p-3 rounded-lg border border-red-200">
                <p className="text-sm text-red-700">Connection error. Please refresh the page.</p>
              </div>
            )}

            {!hasSetName ? (
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-800">
                  Hi! I'm Stuart, your specialist family law property valuer. What's your name and law firm name?
                </p>
              </div>
            ) : (
              <>
                {/* Welcome message */}
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-800">
                    Hi {name}! How can I help with your family law property matter today?
                  </p>
                </div>
                
                {/* Conversation messages */}
                {currentConversation.map((msg) => (
                  <div key={msg.id}>
                    {/* User question */}
                    <div className="bg-black text-white p-3 rounded-lg ml-auto max-w-[85%]">
                      <p className="text-sm">{msg.question}</p>
                      <p className="text-xs text-gray-300 mt-1">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </p>
                    </div>
                    
                    {/* Stuart's reply */}
                    {msg.reply && (
                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mr-auto max-w-[85%] mt-2">
                        <p className="text-sm text-blue-900">{msg.reply}</p>
                        <p className="text-xs text-blue-600 mt-1">
                          Stuart • {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                {isLoading && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 mr-auto">
                    <p className="text-sm text-gray-600">
                      Sending your question...
                    </p>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input with character counter */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="space-y-2">
              {/* Character counter for questions */}
              {hasSetName && (
                <div className="flex justify-between items-center text-xs">
                  <span className={`${remainingChars < 10 ? 'text-red-500' : remainingChars < 25 ? 'text-yellow-500' : 'text-gray-500'}`}>
                    {remainingChars} characters remaining
                  </span>
                  <span className="text-gray-400">
                    {message.length}/{MAX_QUESTION_LENGTH}
                  </span>
                </div>
              )}
              
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={hasSetName ? message : name}
                  onChange={hasSetName ? handleMessageChange : (e) => setName(e.target.value)}
                  placeholder={hasSetName ? `Brief question (max ${MAX_QUESTION_LENGTH} chars)...` : "Enter your name and law firm..."}
                  className={`flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-sm ${
                    hasSetName && message.length > MAX_QUESTION_LENGTH ? 'border-red-500' : ''
                  }`}
                  maxLength={hasSetName ? undefined : 100}
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={(hasSetName && message.length > MAX_QUESTION_LENGTH) || isLoading}
                  className={`p-2 rounded-lg transition-colors text-white ${
                    (hasSetName && message.length > MAX_QUESTION_LENGTH) || isLoading
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-black hover:bg-gray-800'
                  }`}
                >
                  <Send size={16} />
                </button>
              </div>
              
              {/* Warning for long messages */}
              {hasSetName && message.length > MAX_QUESTION_LENGTH && (
                <p className="text-xs text-red-500">
                  Question too long. Please shorten to {MAX_QUESTION_LENGTH} characters or less.
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Stuart Photo Bubble with "Lawyers - Ask Stuart" Text */}
      <button
        onClick={toggleChat}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="bg-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 flex flex-col items-center p-4 min-w-[120px] border-2 border-blue-200 z-[999997] relative"
        style={{ animation: 'pulse 2s infinite' }}
      >
        <img 
          src="https://images.squarespace-cdn.com/content/v1/65d407ca959c8d393d5dc2e0/6273bfbd-7377-495b-89c0-4fa96a195b10/SH.png?format=1000w"
          alt="Stuart"
          className="w-16 h-16 rounded-full object-cover border-2 border-blue-300 mb-2"
        />
        <span className="text-xs font-semibold text-blue-600 text-center leading-tight">
          Lawyers - Ask Stuart
        </span>
      </button>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { 
            transform: scale(1); 
            box-shadow: 0 10px 20px rgba(37, 99, 235, 0.3);
          }
          50% { 
            transform: scale(1.05); 
            box-shadow: 0 15px 30px rgba(37, 99, 235, 0.5);
          }
        }
      `}</style>
    </div>
  );
};

export default ChatWidget;
