"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { auth } from "@/lib/firebase/client";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useEffect, useState } from "react";
import { User } from "firebase/auth";
import LiveTerminal from "./LiveTerminal";

export default function Navbar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  if (!user && pathname === "/login") return null;

  return (
    <nav className="flex items-center justify-between p-4 bg-[#1e1e1e] border-b border-[#2d2d2d]">
      <div className="flex items-center gap-6">
        <h1 className="text-xl font-bold text-white tracking-tight">JobScraper</h1>
        <div className="flex items-center gap-4">
          <Link href="/" className={`text-sm ${pathname === "/" ? "text-white font-medium" : "text-gray-400 hover:text-gray-200"}`}>
            Dashboard
          </Link>
          <Link href="/jobs" className={`text-sm ${pathname === "/jobs" ? "text-white font-medium" : "text-gray-400 hover:text-gray-200"}`}>
            Jobs
          </Link>
          <Link href="/companies" className={`text-sm ${pathname === "/companies" ? "text-white font-medium" : "text-gray-400 hover:text-gray-200"}`}>
            Companies
          </Link>
          <Link href="/profile" className={`text-sm ${pathname === "/profile" ? "text-white font-medium" : "text-gray-400 hover:text-gray-200"}`}>
            Profile (Track Apps)
          </Link>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <button 
          onClick={() => setShowTerminal(!showTerminal)}
          className={`text-xs px-3 py-1.5 border rounded flex items-center gap-2 transition-colors ${showTerminal ? 'bg-[#00ff00] text-black border-[#00ff00]' : 'bg-[#1a1a1a] text-[#00ff00] border-[#333] hover:border-[#00ff00]'}`}
        >
          <span className="font-mono">{">_"}</span>
          Live Terminal
        </button>

        {user ? (
          <>
            <span className="text-xs text-gray-400 border-l border-[#333] pl-4">{user.email}</span>
            <button 
              onClick={() => signOut(auth)}
              className="text-xs px-3 py-1.5 bg-[#252525] border border-[#3a3a3a] rounded hover:border-[#555555] transition-colors"
            >
              Sign out
            </button>
          </>
        ) : (
          <Link 
            href="/login"
            className="text-xs px-4 py-1.5 bg-[#4fa3f7] text-[#121212] font-semibold rounded hover:bg-[#3d8ad9] transition-colors"
          >
            Login / Register
          </Link>
        )}
      </div>
      
      {showTerminal && <LiveTerminal onClose={() => setShowTerminal(false)} />}
    </nav>
  );
}
