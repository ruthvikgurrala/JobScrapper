"use client";

import { useState } from "react";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh]">
      <div className="w-full max-w-md p-8 bg-[#1e1e1e] border border-[#2d2d2d] rounded-xl shadow-xl">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">
          {isLogin ? "Sign In" : "Create Account"}
        </h2>
        {error && <p className="text-red-400 text-sm mb-4 text-center">{error}</p>}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-[#121212] border border-[#2d2d2d] rounded-lg text-white focus:outline-none focus:border-[#4fa3f7]"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 bg-[#121212] border border-[#2d2d2d] rounded-lg text-white focus:outline-none focus:border-[#4fa3f7]"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full mt-4 py-2 bg-[#4fa3f7] hover:bg-[#3d8ad9] text-[#121212] font-semibold rounded-lg transition-colors"
          >
            {isLogin ? "Sign In" : "Sign Up"}
          </button>
        </form>
        <button
          onClick={() => setIsLogin(!isLogin)}
          className="w-full mt-4 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {isLogin ? "Need an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}
