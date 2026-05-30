"use client";

import { useEffect, useState, useRef } from "react";

interface LiveTerminalProps {
  onClose: () => void;
}

export default function LiveTerminal({ onClose }: LiveTerminalProps) {
  const [logs, setLogs] = useState<string>("Initializing terminal connection...");
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const fetchLogs = async () => {
      try {
        const res = await fetch("/api/logs");
        const text = await res.text();
        setLogs(text);
      } catch (err) {
        console.error("Failed to fetch logs:", err);
      }
    };

    fetchLogs(); // Initial fetch
    interval = setInterval(fetchLogs, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Auto-scroll to bottom whenever logs update, IF autoScroll is true
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    if (terminalRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = terminalRef.current;
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isAtBottom);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-80 bg-[#0f0f0f] border-t-2 border-[#333] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-50 flex flex-col font-mono animate-slide-up transition-transform">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#333]">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
            <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
          </div>
          <span className="text-xs text-gray-400 ml-2 select-none">root@job-scraper:~/scraper/logs</span>
          <div className="flex items-center gap-2 ml-4">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] text-green-500 uppercase tracking-widest font-bold">Live</span>
          </div>
        </div>
        <button 
          onClick={onClose}
          className="text-gray-400 hover:text-white px-2 rounded hover:bg-[#333] transition-colors"
        >
          ✕
        </button>
      </div>

      <div 
        ref={terminalRef}
        onScroll={handleScroll}
        className="flex-1 p-4 overflow-y-auto text-sm text-[#00ff00] custom-scrollbar selection:bg-[#00ff00] selection:text-black whitespace-pre-wrap"
      >
        {logs}
      </div>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #0f0f0f;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #333;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #555;
        }
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
      `}</style>
    </div>
  );
}
