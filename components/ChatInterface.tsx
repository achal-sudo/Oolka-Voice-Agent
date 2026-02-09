import React, { useEffect, useRef } from 'react';
import { Message } from '../types';

interface ChatInterfaceProps {
  messages: Message[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages appear
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center space-y-4 opacity-0 animate-fade-in" style={{animationFillMode: 'forwards', animationDuration: '0.7s'}}>
            <div className="w-20 h-20 rounded-full bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-4 shadow-xl shadow-indigo-500/10">
               <span className="text-4xl">👋</span>
            </div>
            <h2 className="text-xl font-semibold text-slate-200">Namaste! Main Dhruva hoon.</h2>
            <p className="text-slate-400 max-w-xs text-sm leading-relaxed">
              Main aapki credit aur loan related problems solve karne mein madad karunga.
            </p>
            <div className="grid grid-cols-1 gap-2 mt-4 text-xs text-slate-500">
               <span className="px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50 hover:border-indigo-500/30 transition-colors">Why is my Credit Score low?</span>
               <span className="px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50 hover:border-indigo-500/30 transition-colors">Reduce Home Loan Interest</span>
               <span className="px-3 py-1.5 bg-slate-800/50 rounded-full border border-slate-700/50 hover:border-indigo-500/30 transition-colors">Refund & Negative Balance</span>
            </div>
        </div>
      )}
      
      {messages.map((msg, index) => (
        <div
          key={msg.id || index}
          className={`flex w-full ${
            msg.role === 'user' ? 'justify-end' : 'justify-start'
          }`}
        >
          <div
            className={`
              max-w-[85%] sm:max-w-[75%] rounded-2xl px-5 py-3.5 text-sm leading-relaxed shadow-lg
              ${msg.role === 'user' 
                ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-tr-none' 
                : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'
              }
            `}
          >
            {msg.text}
          </div>
        </div>
      ))}
      {/* Invisible element to scroll to */}
      <div ref={scrollRef} />
    </div>
  );
};

export default ChatInterface;