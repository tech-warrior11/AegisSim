import React from "react";
import { NavLink } from "react-router-dom";
import {
  Hexagon,
  Activity,
  AlertTriangle,
  FolderGit2,
  Crosshair,
  FileCode2,
  Cpu,
  GraduationCap,
  FileSearch,
  Database,
  Settings,
  Flame,
  Search,
  LogOut,
  Bell,
  ScrollText,
  FileText
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useNotifications } from "../../context/NotificationContext";

export const Sidebar: React.FC = () => {
  const { wsConnected, notifications } = useNotifications();
  const { user, logout } = useAuth();
  const [searchTerm, setSearchTerm] = React.useState("");

  const navItems = [
    { to: "/dashboard", icon: Activity, label: "Central Nexus" },
    { to: "/events", icon: ScrollText, label: "Data Streams" },
    { to: "/alerts", icon: AlertTriangle, label: "Threat Warnings" },
    { to: "/incidents", icon: FolderGit2, label: "Crisis Response" },
    { to: "/simulations", icon: Flame, label: "Red Team Ops", badge: "Live" },
    { to: "/hunting", icon: Crosshair, label: "Adversary Pursuit" },
    { to: "/detections", icon: FileCode2, label: "Defense Logic" },
    { to: "/coverage", icon: Cpu, label: "Tactics Matrix" },
    { to: "/training", icon: GraduationCap, label: "Defender Trials", badge: "Score" },
    { to: "/iocs", icon: Database, label: "Indicators Store" },
    { to: "/reports", icon: FileText, label: "Action Reports" },
    { to: "/audit", icon: FileSearch, label: "System Logs" },
    { to: "/settings", icon: Settings, label: "Nexus Config" },
  ];

  return (
    <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-purple-500/30 flex items-center shrink-0 h-16 sticky top-0 z-50">
      {/* Brand Header */}
      <div className="flex items-center px-6 gap-4 min-w-[240px]">
        <div className="w-10 h-10 rounded-3xl bg-gradient-to-tr from-purple-600 to-pink-500 flex items-center justify-center shadow-[0_0_15px_rgba(168,85,247,0.4)]">
          <Hexagon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-lg tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-300 flex items-center gap-2">
            AEGISSIM
          </h1>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 flex items-center gap-1 overflow-x-auto px-4 no-scrollbar">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                isActive
                  ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_10px_rgba(168,85,247,0.2)]"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
              }`
            }
          >
            <item.icon className="w-4 h-4" />
            <span>{item.label}</span>
            {item.badge && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 border border-pink-500/30">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Search and User Profile */}
      <div className="px-4 flex items-center gap-4 border-l border-purple-500/20 pl-4">
        <form onSubmit={(e) => {
          e.preventDefault();
          if (searchTerm.trim()) window.location.href = `/events?search=${encodeURIComponent(searchTerm.trim())}`;
        }} className="relative w-48 hidden lg:block">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search..."
            className="w-full bg-[#09090b]/50 border border-slate-700/80 rounded-full pl-9 pr-4 py-1.5 text-xs text-slate-200 focus:border-purple-500/80 focus:ring-1 focus:ring-purple-500/80 transition-all"
          />
        </form>

        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-purple-900/50 border border-purple-500/40 flex items-center justify-center text-purple-400 font-bold text-xs">
            {user?.username?.substring(0, 2).toUpperCase() || "AD"}
          </div>
          <button onClick={logout} title="Sign Out" className="p-1.5 hover:text-red-400 text-slate-400 transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

