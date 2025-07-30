import React, { useState } from 'react';
import { Send, Clock, Check, MessageCircle } from 'lucide-react';
import { useMessages } from '../hooks/useFirestore';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useCountdown } from '../hooks/useCountdown';

const AdminPanel: React.FC = () => {
  const { messages } = useMessages();
  const [replies, setReplies] = useState<{ [key: string]: string }>({});
  const countdown = useCountdown(new Date('2025-07-14T00:00:00'));

  const handleReply = async (messageId: string) => {
    const reply = replies[messageId];
    if (!reply?.trim()) return;

    try {
      await updateDoc(doc(db, 'messages', messageId), {
        reply,
        isFromStuart: true,
        read: true
      });
      
      setReplies(prev => ({ ...prev, [messageId]: '' }));
    } catch (error) {
      console.error('Error sending reply:', error);
    }
  };

  const unreadMessages = messages.filter(msg => !msg.read && !msg.isFromStuart);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img 
                  src="https://images.squarespace-cdn.com/content/v1/65d407ca959c8d393d5dc2e0/6273bfbd-7377-495b-89c0-4fa96a195b10/SH.png?format=1000w"
                  alt="Stuart"
                  className="w-12 h-12 rounded-full object-cover border-2 border-blue-200"
                />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Lawyers - Ask Stuart - Admin Panel</h1>
                  <p className="text-gray-600 mt-1">
                    Specialist Family Law Property Valuer - {unreadMessages.length} unread message{unreadMessages.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              
              {/* Launch Countdown */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 rounded-lg border border-blue-200">
                <div className="text-center">
                  {countdown.isLive ? (
                    <div className="text-green-600 font-semibold animate-pulse">
                      🎉 We're Live! 🎉
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs text-gray-600 mb-1">Service Launch</div>
                      <div className="text-lg font-mono font-bold text-blue-600">
                        {countdown.days}d {countdown.hours}h {countdown.minutes}m
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="divide-y divide-gray-200">
            {messages.map((message) => (
              <div key={message.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{message.name}</h3>
                    <p className="text-sm text-gray-500 flex items-center mt-1">
                      <Clock size={14} className="mr-1" />
                      {new Date(message.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {message.read ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <Check size={12} className="mr-1" />
                        Replied
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-900">{message.question}</p>
                </div>

                {message.reply && (
                  <div className="bg-blue-50 p-4 rounded-lg mb-4">
                    <p className="text-blue-900 font-medium">Your Reply:</p>
                    <p className="text-blue-800 mt-1">{message.reply}</p>
                  </div>
                )}

                {!message.reply && (
                  <div className="flex space-x-3">
                    <input
                      type="text"
                      placeholder="Type your reply..."
                      value={replies[message.id] || ''}
                      onChange={(e) => setReplies(prev => ({
                        ...prev,
                        [message.id]: e.target.value
                      }))}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => e.key === 'Enter' && handleReply(message.id)}
                    />
                    <button
                      onClick={() => handleReply(message.id)}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                    >
                      <Send size={16} />
                      <span>Reply</span>
                    </button>
                  </div>
                )}
              </div>
            ))}

            {messages.length === 0 && (
              <div className="p-12 text-center text-gray-500">
                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                <p>No messages yet. Waiting for questions...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
