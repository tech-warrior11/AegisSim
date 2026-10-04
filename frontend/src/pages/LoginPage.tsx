import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Hexagon, Lock, User as UserIcon, ArrowRight, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { ApiService } from "../services/api";

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await ApiService.login({ username, password });
      login(res.data.access_token, res.data.user);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Authentication failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="min-h-screen bg-[#0a0d14] flex flex-col justify-center items-center p-4 relative overflow-hidden">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#141b2a_1px,transparent_1px),linear-gradient(to_bottom,#141b2a_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-30" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand Card */}
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 items-center justify-center shadow-xl shadow-purple-500/20 mb-4 border border-purple-400/30">
            <Hexagon className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold font-mono tracking-wider text-white">
            AEGISSIM <span className="text-pink-400">SOC</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">Advanced Threat Defense Platform</p>
        </div>

        {/* Login Form */}
        <div className="bg-[#0e0c15]/90 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 shadow-2xl">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-950/70 border border-red-500/50 text-red-300 text-xs flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Operator Username
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  autoComplete="off"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#09090b]/90 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono"
                  placeholder="admin"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase font-mono">
                Security Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#09090b]/90 border border-slate-700 rounded-lg pl-10 pr-10 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-mono"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-pink-400 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-400 hover:to-pink-500 text-white font-bold text-sm shadow-lg shadow-purple-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>{loading ? "Authenticating Session..." : "Access Command Center"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>


        </div>
      </div>
    </div>
  );
};

