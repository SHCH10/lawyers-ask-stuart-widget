import React, { useState } from 'react';
import ChatWidget from './components/ChatWidget';
import AdminPanel from './components/AdminPanel';
import { Settings, MessageCircle } from 'lucide-react';

function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Toggle Button */}
      <div className="fixed top-4 right-4 z-50">
        <button
          onClick={() => setIsAdmin(!isAdmin)}
          className="bg-white shadow-lg rounded-lg p-3 hover:bg-gray-50 transition-colors border border-gray-200"
          title={isAdmin ? "Switch to Chat View" : "Switch to Admin View"}
        >
          {isAdmin ? <MessageCircle size={20} /> : <Settings size={20} />}
        </button>
      </div>

      {isAdmin ? (
        <AdminPanel />
      ) : (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="mb-8">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={40} className="text-white" />
              </div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Lawyers - Ask Stuart</h1>
              <p className="text-xl text-gray-600">Specialist Family Law Property Valuer</p>
            </div>
            
            <div className="bg-white p-8 rounded-lg shadow-sm border border-gray-200 max-w-md mx-auto">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">How it works:</h2>
              <div className="space-y-3 text-left">
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">1</span>
                  </div>
                  <p className="text-gray-700">Click the chat bubble to ask your family law property question</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">2</span>
                  </div>
                  <p className="text-gray-700">Stuart receives your question instantly</p>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-blue-600 text-sm font-semibold">3</span>
                  </div>
                  <p className="text-gray-700">Get expert property valuation guidance in real-time</p>
                </div>
              </div>
            </div>
          </div>
          <ChatWidget />
        </div>
      )}
    </div>
  );
}

export default App;
