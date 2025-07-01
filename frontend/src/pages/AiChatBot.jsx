import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';

const AiChatBot = () => {
  const [messages, setMessages] = useState(() => {
    const saved = sessionStorage.getItem("chatMessages");
    return saved ? JSON.parse(saved) : [];
  });

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const lastUtteranceRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Restore saved messages + scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    sessionStorage.setItem("chatMessages", JSON.stringify(messages));
  }, [messages]);

  const speak = (text) => {
    const synth = window.speechSynthesis;
    if (synth.speaking) synth.cancel();
  
    // Clean the text for speech: remove leading asterisks but keep the message
    const cleanText = text
      .replace(/[*]{1,2}\s*/g, "") // remove one or two asterisks followed by optional spaces
      .replace(/\n+/g, ". ");      // replace newlines with periods
  
    const utter = new SpeechSynthesisUtterance(cleanText);
    lastUtteranceRef.current = utter;
    utter.onend = () => setIsSpeaking(false);
    synth.speak(utter);
    setIsSpeaking(true);
  };
  
  

  const toggleSpeech = () => {
    const synth = window.speechSynthesis;
    if (synth.speaking) {
      synth.cancel();
      setIsSpeaking(false);
    } else if (lastUtteranceRef.current) {
      synth.speak(lastUtteranceRef.current);
      setIsSpeaking(true);
    }
  };

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new webkitSpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };
    recognition.start();
    recognitionRef.current = recognition;
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { text: input, sender: "user", time: new Date().toLocaleTimeString() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    try {
      const prompt = `You are a compassionate health assistant. Respond in a helpful and friendly tone.\nUser: ${input}`;
      const response = await axios.post("http://localhost:4000/api/chat", { message: prompt });
      const botMessage = { text: response.data.reply, sender: "bot", time: new Date().toLocaleTimeString() };

      setMessages([...newMessages, botMessage]);
      speak(response.data.reply);
    } catch (error) {
      console.error("Error fetching AI response:", error);
      setMessages([
        ...newMessages,
        {
          text: "Sorry, I'm having trouble responding right now.",
          sender: "bot",
          time: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    sessionStorage.removeItem("chatMessages");
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen w-full bg-gradient-to-b from-blue-100 to-white p-4 overflow-hidden">
      <div className="w-full max-w-2xl shadow-xl rounded-2xl bg-white p-6 flex flex-col" style={{ height: '80vh' }}>
        <header className="mb-4 text-center">
        <h1 className="text-2xl font-extrabold text-blue-700 flex items-center justify-center gap-2 text-center">
  <img src="/heart-beat.png" alt="Heart Beat" className="w-6 h-6" />
  MediBot - Your AI Health Assistant
</h1>


          <p className="text-sm text-gray-500 mt-1">Ask me anything related to your health</p>
        </header>

        <div className="border rounded-lg p-4 bg-gray-50 space-y-3 shadow-inner overflow-y-auto" style={{ maxHeight: '55vh' }}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-end ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`flex items-center space-x-2 ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
                <div className="text-xl">
                {msg.sender === "user" ? "🤵" : <img src="/heart-beat.png" alt="Bot" className="w-5 h-5 inline-block" />}

                </div>
                <div className={`max-w-[80%] p-3 rounded-xl shadow text-sm whitespace-pre-line ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white text-right"
                    : "bg-gray-200 text-gray-800"
                }`}>
                  {msg.sender === "bot" && msg.text.match(/[*]{1,2} /)
                    ? (
                      <ul className="list-disc pl-5 space-y-1">
                        {msg.text
                          .split(/\*{1,2} /)
                          .filter((line) => line.trim() !== "")
                          .map((point, i) => (
                            <li key={i}>{point.trim()}</li>
                          ))}
                      </ul>
                    )
                    : msg.text}

                  <div className="text-[10px] text-right mt-1 text-gray-400">{msg.time}</div>
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex items-center space-x-2 text-sm text-gray-400 italic">
              <span className="animate-pulse">MediBot is replying</span>
              <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-4 flex gap-2">
          <textarea
            rows={1}
            className="flex-1 border rounded-xl p-2 shadow focus:outline-none focus:ring-2 focus:ring-blue-400 transition resize-none"
            placeholder="Enter your symptoms..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
          />
          <button className="bg-blue-500 text-white px-4 rounded-xl shadow hover:bg-blue-600" onClick={sendMessage}>
            Send
          </button>
          <button
  className="bg-gray-300 px-4 py-2 rounded-xl hover:bg-gray-400 flex items-center justify-center"
  onClick={startListening}
>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 384 512"
    fill="currentColor"
    className="w-5 h-5 text-gray-800"
  >
    <path d="M192 0C139 0 96 43 96 96l0 160c0 53 43 96 96 96s96-43 96-96l0-160c0-53-43-96-96-96zM64 216c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 89.1 66.2 162.7 152 174.4l0 33.6-48 0c-13.3 0-24 10.7-24 24s10.7 24 24 24l72 0 72 0c13.3 0 24-10.7 24-24s-10.7-24-24-24l-48 0 0-33.6c85.8-11.7 152-85.3 152-174.4l0-40c0-13.3-10.7-24-24-24s-24 10.7-24 24l0 40c0 70.7-57.3 128-128 128s-128-57.3-128-128l0-40z"/>
  </svg>
</button>

<button
  className={`px-4 py-2 rounded-xl ${
    isSpeaking ? "bg-red-400" : "bg-green-400"
  } text-white flex items-center justify-center`}
  onClick={toggleSpeech}
>
  {isSpeaking ? (
    // 🔇 Icon (Crossed mic)
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 576 512"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3zM425 167l55 55 55-55c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9l-55 55 55 55c9.4 9.4 9.4 24.6 0 33.9s-24.6 9.4-33.9 0l-55-55-55 55c-9.4 9.4-24.6 9.4-33.9 0s-9.4-24.6 0-33.9l55-55-55-55c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0z"/>
    </svg>
  ) : (
    // 🔈 Icon (Mic with sound waves)
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 640 512"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M533.6 32.5C598.5 85.2 640 165.8 640 256s-41.5 170.7-106.4 223.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C557.5 398.2 592 331.2 592 256s-34.5-142.2-88.7-186.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM473.1 107c43.2 35.2 70.9 88.9 70.9 149s-27.7 113.8-70.9 149c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C475.3 341.3 496 301.1 496 256s-20.7-85.3-53.2-111.8c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zm-60.5 74.5C434.1 199.1 448 225.9 448 256s-13.9 56.9-35.4 74.5c-10.3 8.4-25.4 6.8-33.8-3.5s-6.8-25.4 3.5-33.8C393.1 284.4 400 271 400 256s-6.9-28.4-17.7-37.3c-10.3-8.4-11.8-23.5-3.5-33.8s23.5-11.8 33.8-3.5zM301.1 34.8C312.6 40 320 51.4 320 64l0 384c0 12.6-7.4 24-18.9 29.2s-25 3.1-34.4-5.3L131.8 352 64 352c-35.3 0-64-28.7-64-64l0-64c0-35.3 28.7-64 64-64l67.8 0L266.7 40.1c9.4-8.4 22.9-10.4 34.4-5.3z"/>
    </svg>
  )}
</button>

        </div>

        {/* Clear Chat Button */}
        <div className="flex justify-end mt-2">
          <button
            onClick={clearChat}
            className="bg-red-500 text-white px-4 py-1 rounded-xl shadow hover:bg-red-600"
          >
            Clear Chat
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiChatBot;
