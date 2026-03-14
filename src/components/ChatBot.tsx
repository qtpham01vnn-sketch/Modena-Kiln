import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import { MessageCircle, X, Send, Loader2, Bot, User } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  pageData?: any;
}

const ChatBot: React.FC<ChatBotProps> = ({ pageData }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: 'Chào anh Tuấn! Em là trợ lý ảo của hệ thống MODENA VISION AI. Em có thể giúp gì cho anh về dữ liệu lò nung hôm nay?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const model = "gemini-3-flash-preview";
      
      const systemInstruction = `
        Bạn là một trợ lý ảo thông minh tên là "Modena AI Assistant", chuyên hỗ trợ người vận hành hệ thống MODENA VISION AI OCR.
        
        Bối cảnh hệ thống:
        - Đây là hệ thống trích xuất dữ liệu từ bảng điều khiển lò nung gạch men Modena.
        - Sử dụng mô hình Gemini 3 Flash Preview để đọc ảnh.
        - Công nghệ cốt lõi: "Spatial Precision Mapping" - dóng hàng dọc (X-Axis Locking) để ghép cặp nhiệt độ Trên/Dưới chính xác.
        - AI chỉ lấy Số Xanh (SV - Setpoint), không lấy Số Đỏ (PV - Actual).
        - Dữ liệu bao gồm các cặp nhiệt độ (M31 đến M57) và dữ liệu phòng Lab (Cường độ bẻ, Độ dày, Phá hủy, Bền uốn).
        - Có 2 dây chuyền: DC1 và DC2. Có 2 loại lò: Men và Xương.
        
        Dữ liệu hiện tại trên trang (nếu có):
        ${JSON.stringify(pageData, null, 2)}
        
        Hướng dẫn trả lời:
        1. Luôn trả lời bằng tiếng Việt, thân thiện, chuyên nghiệp (xưng hô "Em" và gọi người dùng là "Anh/Chị" hoặc "Anh Tuấn" nếu biết).
        2. Nếu người dùng hỏi về dữ liệu hiện tại, hãy phân tích dữ liệu trong JSON pageData được cung cấp.
        3. Nếu dữ liệu có lỗi (ERR_READ, NOT_FOUND), hãy hướng dẫn người dùng kiểm tra lại ảnh chụp (độ sáng, góc chụp) hoặc nhập thủ công.
        4. Giải thích nguyên lý: "Em sử dụng thuật toán dóng hàng dọc để đảm bảo số M31 trên luôn đi cùng M031 dưới, và em chỉ ưu tiên đọc số màu xanh lá cây trên đồng hồ."
        5. Hướng dẫn sử dụng: Nhắc người dùng chụp rõ màn hình HMI cho Cycle, bảng điều khiển cho nhiệt độ và phiếu Lab cho cơ lý.
      `;

      const response = await ai.models.generateContent({
        model,
        contents: messages.concat({ role: 'user', text: userMessage }).map(m => ({
          role: m.role,
          parts: [{ text: m.text }]
        })),
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const aiText = response.text || "Xin lỗi anh, em gặp chút trục trặc khi xử lý câu hỏi này.";
      setMessages(prev => [...prev, { role: 'model', text: aiText }]);
    } catch (error) {
      console.error("ChatBot Error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "🔴 Đã xảy ra lỗi khi kết nối với máy chủ AI. Anh vui lòng thử lại sau nhé." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="bg-slate-900 border border-slate-700 w-80 sm:w-96 h-[500px] rounded-2xl shadow-2xl flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="p-4 border-bottom border-slate-700 bg-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Bot size={18} className="text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Modena AI Assistant</h3>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider">Trực tuyến</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-700 rounded-lg transition-colors text-slate-400"
              >
                <X size={20} />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`flex gap-2 max-w-[85%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                    <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${msg.role === 'user' ? 'bg-slate-700' : 'bg-emerald-500/20 text-emerald-500'}`}>
                      {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                    </div>
                    <div className={`p-3 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none border border-slate-700'}`}>
                      {msg.text}
                    </div>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex gap-2 max-w-[85%]">
                    <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mt-1">
                      <Bot size={14} />
                    </div>
                    <div className="p-3 rounded-2xl bg-slate-800 border border-slate-700 rounded-tl-none">
                      <Loader2 size={14} className="animate-spin text-emerald-500" />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-700 bg-slate-900">
              <div className="relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  placeholder="Hỏi em về dữ liệu lò nung..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-4 pr-12 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-all"
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-slate-800 rotate-90' : 'bg-emerald-500 hover:bg-emerald-600 hover:scale-110'}`}
      >
        {isOpen ? <X className="text-white" /> : <MessageCircle className="text-white" size={28} />}
      </button>
    </div>
  );
};

export default ChatBot;
