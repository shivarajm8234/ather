import React, { useState, useEffect } from 'react';
import { 
  Zap, LayoutDashboard, Users, Columns4, PhoneCall, Wrench, 
  UserCog, MessageSquare, BarChart3, Settings, LogOut, 
  Search, Bell, HelpCircle, ChevronDown, Clock, Sparkles,
  AlertCircle, Brain, Network, Smile, TrendingUp, MoreHorizontal,
  ShieldCheck, Fingerprint, Key, Lock, X, ArrowRight, BrainCircuit, ChevronRight, Plus,
  Calendar, Trash2
} from 'lucide-react';
const CalendarIcon = Calendar;
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const LeadDetailModal = ({ lead, isOpen, onClose, calls }) => {
  const [expandedCallId, setExpandedCallId] = useState(null);
  if (!isOpen || !lead) return null;
  const leadCalls = (calls || []).filter(c => c.phone === lead.phone || c.customer_name === lead.customer_name);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }} 
        animate={{ opacity: 1 }} 
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
      />
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="relative bg-surface-sidebar border border-white/10 rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl"
      >
        <div className="p-10">
          <header className="flex justify-between items-start mb-10">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Badge type={lead.priority.toLowerCase()}>{lead.priority} PRIORITY</Badge>
                <span className="text-slate-500 text-xs font-bold uppercase tracking-widest">{lead.source}</span>
              </div>
              <h2 className="text-5xl font-bold font-outfit mb-2 tracking-tight">{lead.customer_name}</h2>
              <div className="flex items-center gap-4 text-slate-400">
                <div className="flex items-center gap-2"><PhoneCall size={14} /> {lead.phone}</div>
                <div className="w-1 h-1 bg-slate-700 rounded-full"></div>
                <div className="flex items-center gap-2"><Clock size={14} /> Registered {new Date(lead.timestamp).toLocaleDateString()}</div>
              </div>
            </div>
            <button onClick={onClose} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors">
              <X size={24} />
            </button>
          </header>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-6">
              <div className="glass-card p-8">
                <h3 className="text-lg font-bold mb-6 font-outfit">Lead Intelligence</h3>
                <div className="space-y-6">
                   <div>
                      <label className="text-[0.65rem] text-slate-500 uppercase block mb-1 font-bold">Intent Probability</label>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                           <div className="h-full bg-primary" style={{ width: lead.priority === 'Hot' ? '90%' : lead.priority === 'Medium' ? '60%' : '30%' }}></div>
                        </div>
                        <span className="text-sm font-bold text-primary">{lead.priority === 'Hot' ? '90%' : lead.priority === 'Medium' ? '60%' : '30%'}%</span>
                      </div>
                   </div>
                   <div className="pt-4 border-t border-white/5">
                      <label className="text-[0.65rem] text-slate-500 uppercase block mb-1 font-bold">Latest Intelligence</label>
                      <p className="text-sm text-slate-300 leading-relaxed italic">"{lead.notes || 'No recent notes.'}"</p>
                   </div>
                </div>
              </div>

              <div className="glass-card p-8 border-primary/20 bg-primary/5">
                 <h3 className="text-lg font-bold mb-4 font-outfit flex items-center gap-2">
                   <Sparkles size={18} className="text-primary" /> AI Next Step
                 </h3>
                 <p className="text-sm text-slate-300 leading-relaxed">
                   {lead.priority === 'Hot' ? 'Immediate high-intent signal detected. Schedule an Ather 450X experience session today.' : 'Lead in discovery phase. Automate discovery follow-up for day 3.'}
                 </p>
                 <button className="btn-primary w-full mt-6 text-sm" onClick={() => alert('AI Action Triggered!')}>Trigger Action</button>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-8 glass-card p-8">
               <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                  {leadCalls.map((call, idx) => {
                    const isExpanded = expandedCallId === (call.unique_id || idx);
                    return (
                      <div key={idx} className="relative pl-10">
                        <div className="absolute left-0 top-1.5 w-6 h-6 bg-surface-sidebar border-2 border-primary rounded-full flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-primary rounded-full"></div>
                        </div>
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-bold text-sm text-primary">Autonomous Voice Interaction</div>
                          <span className="text-[0.65rem] text-slate-500 font-bold uppercase">{new Date(call.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="bg-white/2 border border-white/5 rounded-[1.5rem] p-6">
                          <div className="flex items-center justify-between mb-4">
                             <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${call.summary.toLowerCase().includes('interested') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                                  <Smile size={16} />
                                </div>
                                <span className="text-xs font-bold uppercase tracking-wider">{call.summary.toLowerCase().includes('interested') ? 'Positive Momentum' : 'Neutral Inquiry'}</span>
                             </div>
                             <button 
                               onClick={() => setExpandedCallId(isExpanded ? null : (call.unique_id || idx))}
                               className="text-[0.65rem] font-bold text-primary hover:underline uppercase tracking-widest"
                             >
                                {isExpanded ? 'Hide Details' : 'View Full Conversation'}
                             </button>
                          </div>
                          
                          <p className={`text-sm text-slate-300 leading-relaxed ${isExpanded ? 'mb-6' : 'line-clamp-1'}`}>
                             {call.summary.includes('Agent:') && !isExpanded ? 'Autonomous Voice Interaction Log' : call.summary}
                          </p>

                          {(isExpanded && (call.conversation || call.dialogue)) && (
                            <div className="mt-6 space-y-4 pt-6 border-t border-white/5">
                               {(call.conversation || call.dialogue).map((msg, mIdx) => (
                                 <div key={mIdx} className={`flex ${msg.role === 'agent' ? 'justify-start' : 'justify-end'}`}>
                                    <div className={`max-w-[80%] p-4 rounded-2xl text-xs leading-relaxed ${msg.role === 'agent' ? 'bg-white/5 text-slate-300 rounded-tl-none' : 'bg-primary text-white rounded-tr-none shadow-lg'}`}>
                                       <div className="font-bold uppercase text-[0.5rem] mb-1 opacity-50">{msg.role}</div>
                                       {msg.content}
                                    </div>
                                 </div>
                               ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                 {leadCalls.length === 0 && (
                   <div className="text-center py-20 text-slate-600 text-sm italic">Deep interaction history currently unavailable for this profile.</div>
                 )}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// --- Components ---

const Badge = ({ children, type = 'default' }) => {
  const styles = {
    default: 'bg-white/5 text-slate-400',
    hot: 'bg-rose-500/10 text-rose-500',
    warm: 'bg-amber-500/10 text-amber-500',
    cold: 'bg-blue-500/10 text-blue-500',
    success: 'bg-emerald-500/10 text-emerald-500',
  };
  return (
    <span className={`px-2 py-1 rounded-md text-[0.75rem] font-bold ${styles[type] || styles.default}`}>
      {children}
    </span>
  );
};

const KPICard = ({ icon: Icon, label, value, trend, colorClass }) => (
  <motion.div 
    whileHover={{ y: -5 }}
    className="glass-card p-6"
  >
    <div className="flex justify-between items-start mb-4">
      <div className={`p-3 rounded-xl ${colorClass}`}>
        <Icon size={20} />
      </div>
      {trend && (
        <span className={`text-[0.75rem] font-bold px-2 py-1 rounded-md ${trend.startsWith('+') ? 'badge-success' : 'badge-danger'}`}>
          {trend}
        </span>
      )}
    </div>
    <div className="text-2xl font-bold font-outfit mb-1">{value}</div>
    <div className="text-sm text-slate-400">{label}</div>
  </motion.div>
);

const App = () => {
  // Auth State with Persistence
  const [authState, setAuthState] = useState(() => {
    return localStorage.getItem('ather_auth_state') || 'login';
  });
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('ather_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  // Persistence Effect
  useEffect(() => {
    localStorage.setItem('ather_auth_state', authState);
    if (user) {
      localStorage.setItem('ather_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('ather_user');
    }
  }, [authState, user]);
  
  // Dashboard State
  const [currentView, setCurrentView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLead, setSelectedLead] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [leadFilter, setLeadFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const [data, setData] = useState({ leads: [], service: [], calls: [], knowledge: null, staff: [], feedback: [] });
  const [time, setTime] = useState(new Date().toLocaleTimeString());
  const [serverIp, setServerIp] = useState('Detecting...');
  const [aiSettings, setAiSettings] = useState({ proactive: true, autoAssign: true });
  const [lastUpdated, setLastUpdated] = useState(null);

  const filteredLeads = (data.leads || []).filter(l => 
    l.phone?.includes(searchTerm)
  );

  const recentCalls = (data.calls || []).filter(c => {
    const callTime = new Date(c.timestamp).getTime();
    const now = new Date().getTime();
    return (now - callTime) < 15000; // Show for 15 seconds
  });

  useEffect(() => {
    // Sync view with URL path on load
    const path = window.location.pathname.slice(1);
    const validViews = ['dashboard', 'leads', 'pipeline', 'followup', 'service', 'staff', 'feedback', 'reports', 'settings', 'profile'];
    if (validViews.includes(path)) {
      setCurrentView(path);
    }

    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    fetch('/api/ip').then(r => r.json()).then(d => setServerIp(d.ip)).catch(() => setServerIp('127.0.0.1'));
    if (authState === 'dashboard') {
        fetchData();
        const poll = setInterval(fetchData, 3000);
        return () => { clearInterval(timer); clearInterval(poll); };
    }
    return () => clearInterval(timer);
  }, [authState]);

  const fetchData = async () => {
    try {
      const fetchJson = (url) => fetch(`${url}?t=${Date.now()}`).then(r => r.ok ? r.json() : []).catch(() => []);
      
      const [leads, service, calls, knowledge, staff, feedback] = await Promise.all([
        fetchJson('/api/leads'),
        fetchJson('/api/service'),
        fetchJson('/api/calls'),
        fetch('/api/knowledge').then(r => r.json()).catch(() => null),
        fetchJson('/api/staff'),
        fetchJson('/api/feedback')
      ]);
      
      setData({ leads, service, calls, knowledge, staff, feedback });
      setLastUpdated(new Date().toLocaleTimeString());
    } catch (e) {
      console.error("Fetch failed", e);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const username = e.target[0].value;
    const password = e.target[1].value;

    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const res = await response.json();
      if (res.status === 'success') {
        setAuthState('2fa');
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error("Login failed", e);
    }
  };

  const handleUpdateStaff = async (staffMember) => {
    try {
      const response = await fetch('/api/staff/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffMember)
      });
      if (response.ok) {
        fetchData(); // Refresh local state
        return true;
      }
    } catch (e) {
      console.error("Update failed", e);
    }
    return false;
  };

  const handleVerify2FA = async (code) => {
    try {
      const response = await fetch('/api/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });
      const res = await response.json();
      if (res.status === 'success') {
        setAuthState('dashboard');
        setUser(res.user);
      } else {
        alert(res.message);
      }
    } catch (e) {
      console.error("2FA verification failed", e);
    }
  };

  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const handleLogout = () => {
    setAuthState('login');
    setUser(null);
    setCurrentView('dashboard');
    setSelectedLead(null);
    setShowProfileMenu(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, group: 'Intelligence' },
    { id: 'leads', label: 'Lead Management', icon: Users, group: 'Intelligence' },
    { id: 'pipeline', label: 'Sales Pipeline', icon: Columns4, group: 'Intelligence' },
    { id: 'followup', label: 'AI Follow-up Center', icon: PhoneCall, group: 'Intelligence' },
    { id: 'service', label: 'Service Center', icon: Wrench, group: 'Operations' },
    { id: 'staff', label: 'Staff Management', icon: UserCog, group: 'Operations' },
    { id: 'feedback', label: 'Customer Feedback', icon: MessageSquare, group: 'Operations' },
    { id: 'reports', label: 'Global Reports', icon: BarChart3, group: 'Analytics' },
    { id: 'settings', label: 'Settings', icon: Settings, group: 'Analytics' },
  ];

  const handleLeadClick = (lead) => {
    setSelectedLead(lead);
    setIsModalOpen(true);
  };

  if (authState === 'login') {
    return (
      <div className="flex h-screen w-screen bg-surface-main items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full"></div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md glass-card p-10 z-10 border-white/10"
        >
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-[0_0_30px_rgba(32,178,170,0.3)] mb-6">
              <Zap size={32} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold font-outfit mb-2">Ather Enterprise</h1>
            <p className="text-slate-500 text-sm">Secure Intelligence Portal Access</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Administrator ID</label>
              <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-primary/50 transition-all">
                <Users size={18} className="text-slate-500" />
                <input type="text" placeholder="admin@ather.com" className="bg-transparent border-none outline-none w-full text-sm text-white" defaultValue="admin@ather.energy" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Access Key</label>
              <div className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 flex items-center gap-3 focus-within:border-primary/50 transition-all">
                <Lock size={18} className="text-slate-500" />
                <input type="password" placeholder="••••••••" className="bg-transparent border-none outline-none w-full text-sm text-white" defaultValue="password" />
              </div>
            </div>
            <button type="submit" className="btn-primary w-full py-4 font-bold text-sm mt-4 flex items-center justify-center gap-2">
              Authenticate <ShieldCheck size={18} />
            </button>
          </form>

          <div className="mt-10 pt-6 border-t border-white/5 text-center">
            <p className="text-[0.7rem] text-slate-600 uppercase tracking-tighter font-bold flex items-center justify-center gap-2">
               <Fingerprint size={12} /> Biometric Bypass Available on Mobile App
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  if (authState === '2fa') {
    return (
      <div className="flex h-screen w-screen bg-surface-main items-center justify-center relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 blur-[120px] rounded-full"></div>
        
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md glass-card p-10 z-10 border-white/10 text-center"
        >
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 text-primary border border-white/10">
            <Key size={32} />
          </div>
          <h1 className="text-2xl font-bold font-outfit mb-2">Two-Step Verification</h1>
          <p className="text-slate-500 text-sm mb-10 leading-relaxed">
            Enter the 6-digit verification code from your <br /> <b>Google Authenticator</b> or <b>Authy</b> app.
          </p>

          <div className="flex gap-3 justify-center mb-10">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <input 
                key={i}
                id={`otp-${i}`}
                type="text" 
                maxLength="1"
                className="w-12 h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold font-outfit focus:border-primary focus:bg-primary/5 transition-all outline-none"
                onKeyDown={(e) => {
                    if (e.key === 'Backspace' && !e.currentTarget.value && i > 0) {
                        document.getElementById(`otp-${i-1}`).focus();
                    }
                }}
                onChange={(e) => {
                    const val = e.target.value;
                    if (val && i < 5) {
                        document.getElementById(`otp-${i+1}`).focus();
                    }
                    if (val && i === 5) {
                        const code = [0,1,2,3,4,5].map(idx => document.getElementById(`otp-${idx}`).value).join('');
                        if (code.length === 6) handleVerify2FA(code);
                    }
                }}
                autoFocus={i === 0}
              />
            ))}
          </div>

          <button onClick={() => handleVerify2FA("123456")} className="text-primary text-sm font-bold hover:underline mb-8 block mx-auto">
             Verify and Access Dashboard
          </button>

          <div className="pt-6 border-t border-white/5 text-center">
            <button onClick={() => setAuthState('login')} className="text-xs text-slate-500 hover:text-white transition-colors">
              Cancel and return to Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen bg-surface-main text-slate-50 font-inter">
      {/* Sidebar */}
      <aside className="w-72 bg-surface-sidebar border-r border-white/5 flex flex-col z-50">
        <div className="p-8 flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(32,178,170,0.4)]">
            <Zap size={24} className="text-white" />
          </div>
          <span className="text-2xl font-bold font-outfit bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
            Ather AI
          </span>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto no-scrollbar">
          {['Intelligence', 'Operations', 'Analytics'].map(group => (
            <div key={group} className="mb-6">
              <div className="px-4 mb-2 text-[0.7rem] font-bold text-slate-500 uppercase tracking-wider">
                {group}
              </div>
              {navItems.filter(item => item.group === group).map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setCurrentView(item.id);
                    setSelectedLead(null);
                    window.history.pushState({}, '', `/${item.id}`);
                  }}
                  className={`nav-item ${currentView === item.id ? 'nav-item-active' : ''}`}
                >
                  <item.icon size={18} />
                  {item.label}
                </div>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-6 border-t border-white/5">
          <div className="nav-item mb-0 hover:text-rose-500 hover:bg-rose-500/5 transition-all" onClick={handleLogout}>
            <LogOut size={18} />
            Sign Out
          </div>
        </div>
      </aside>

       {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Global Active Call Alert */}
        <AnimatePresence>
          {recentCalls.length > 0 && (
            <motion.div 
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -50, opacity: 0 }}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-[100] w-[400px]"
            >
              <div className="bg-primary/20 backdrop-blur-xl border border-primary/50 rounded-2xl p-4 flex items-center justify-between shadow-[0_0_50px_rgba(var(--primary-rgb),0.3)]">
                <div className="flex items-center gap-4">
                  <div className="relative">
                     <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white animate-pulse">
                        <PhoneCall size={18} />
                     </div>
                     <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#0B0C10] flex items-center justify-center text-[0.5rem] font-bold">
                        LIVE
                     </div>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-primary uppercase tracking-widest">Active AI Interaction</div>
                    <div className="text-sm font-bold text-white">Call from {recentCalls[0].phone}</div>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentView('followup')}
                  className="bg-primary text-white text-[0.65rem] font-bold px-4 py-2 rounded-lg hover:bg-primary/80 transition-all uppercase"
                >
                  View Details
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="h-[72px] px-10 border-b border-white/5 flex items-center justify-between bg-surface-main/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-8">
            <div className="w-[400px] bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3 focus-within:border-primary/50 transition-colors">
              <Search size={18} className="text-slate-500" />
              <input 
                type="text" 
                placeholder="Search leads, phone, or status..." 
                className="bg-transparent border-none outline-none w-full text-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="pl-8 border-l border-white/5 flex flex-col justify-center">
              <div className="flex items-center gap-2">
                <Clock size={14} className="text-primary" />
                <span className="text-sm font-semibold text-slate-400">{time}</span>
              </div>
              {lastUpdated && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-[0.65rem] text-slate-500 font-bold uppercase tracking-tighter">Synced {lastUpdated}</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative">
              <div 
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="pl-6 border-l border-white/5 flex items-center gap-3 cursor-pointer group"
              >
                <div className="text-right">
                  <div className="text-sm font-bold group-hover:text-primary transition-colors">{user?.name || 'Alex Richardson'}</div>
                  <div className="text-[0.7rem] text-slate-500">{user?.role || 'Showroom Manager'}</div>
                </div>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-emerald-400"></div>
                <ChevronDown size={14} className={`text-slate-500 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
              </div>

              <AnimatePresence>
                {showProfileMenu && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-4 w-64 glass-card p-2 z-[60] border-white/10 shadow-2xl"
                  >
                    <div className="p-4 border-b border-white/5 mb-2">
                       <div className="font-bold text-sm">{user?.name || 'Alex Richardson'}</div>
                       <div className="text-xs text-slate-500">admin@ather.energy</div>
                    </div>
                    <div className="space-y-1">
                      <div className="nav-item text-xs py-2" onClick={() => { setCurrentView('profile'); setShowProfileMenu(false); }}>
                        <UserCog size={14} /> Profile Settings
                      </div>
                      <div className="nav-item text-xs py-2" onClick={() => { setCurrentView('settings'); setShowProfileMenu(false); }}>
                        <ShieldCheck size={14} /> Security & 2FA
                      </div>
                      <div className="nav-item text-xs py-2" onClick={() => setShowProfileMenu(false)}>
                        <HelpCircle size={14} /> Help Center
                      </div>
                      <div className="h-[1px] bg-white/5 my-1"></div>
                      <div className="nav-item text-xs py-2 text-rose-500 hover:bg-rose-500/10" onClick={handleLogout}>
                        <LogOut size={14} /> Sign Out
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        {/* View Root */}
        <div className="flex-1 overflow-y-auto p-10 no-scrollbar">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {renderView(
                currentView, 
                { ...data, leads: filteredLeads }, 
                setCurrentView,
                handleLeadClick, 
                selectedLead, 
                leadFilter, 
                setLeadFilter, 
                aiSettings, 
                setAiSettings, 
                serverIp, 
                user,
                selectedFeedback,
                setSelectedFeedback,
                selectedStaff,
                setSelectedStaff,
                handleUpdateStaff,
                searchTerm,
                setSearchTerm,
                setIsServiceModalOpen,
                selectedDate,
                setSelectedDate
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        <LeadDetailModal 
          isOpen={isModalOpen} 
          onClose={() => setIsModalOpen(false)} 
          lead={selectedLead} 
          calls={data.calls} 
        />

        {isServiceModalOpen && selectedService && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-card w-full max-w-xl p-8 relative z-10 border-primary/30 shadow-2xl"
            >
              <header className="flex justify-between items-start mb-6">
                <div>
                  <Badge type={selectedService.status === 'Scheduled' ? 'success' : 'warm'}>{selectedService.status}</Badge>
                  <h3 className="text-2xl font-bold font-outfit mt-3">{selectedService.customer_name}</h3>
                  <p className="text-slate-400 text-sm">Vehicle: {selectedService.vehicle_no}</p>
                </div>
                <button onClick={() => setIsServiceModalOpen(false)} className="p-2 hover:bg-white/5 rounded-lg transition-colors">
                  <X size={20} className="text-slate-500" />
                </button>
              </header>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="text-[0.65rem] text-slate-500 uppercase font-bold mb-1">Appointment Time</div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <Clock size={14} className="text-primary" /> {selectedService.appointment_date} | {selectedService.appointment_time}
                  </div>
                </div>
                <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                  <div className="text-[0.65rem] text-slate-500 uppercase font-bold mb-1">Station Allotment</div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    <Network size={14} className="text-primary" /> {selectedService.station || 'Pending Allotment'}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="text-sm font-bold border-b border-white/5 pb-2">Service Details</div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Service Type</span>
                  <span className="text-white font-medium">{selectedService.service_type}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Last Recorded Odometer</span>
                  <span className="text-white font-medium">{selectedService.current_km} KM</span>
                </div>
              </div>

              <div className="mt-10 flex gap-3">
                <button className="btn-primary flex-1 py-3">Reschedule</button>
                <button className="flex-1 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-bold hover:bg-white/10 transition-all">Cancel Booking</button>
              </div>
            </motion.div>
          </div>
        )}
        
        {isAddingStaff && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddingStaff(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="glass-card w-full max-w-2xl p-10 relative z-10 border-primary/30 shadow-2xl"
            >
              <h2 className="text-3xl font-bold font-outfit mb-6">Create New AI Specialist</h2>
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Agent Name</label>
                    <input 
                      type="text" 
                      id="new-staff-name"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                      placeholder="e.g. Luna"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-500 uppercase">Role</label>
                    <input 
                      type="text" 
                      id="new-staff-role"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                      placeholder="e.g. Sales Expert"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Instructions & Directives</label>
                  <textarea 
                    id="new-staff-instructions"
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-primary/50"
                    placeholder="Focus on high-intent leads..."
                  />
                </div>
                <div className="flex justify-end gap-4 mt-8">
                   <button onClick={() => setIsAddingStaff(false)} className="px-6 py-3 text-sm font-bold text-slate-400 hover:text-white transition-colors">Cancel</button>
                   <button 
                     onClick={() => {
                       const name = document.getElementById('new-staff-name').value;
                       const role = document.getElementById('new-staff-role').value;
                       const instructions = document.getElementById('new-staff-instructions').value;
                       if (name && role) {
                         fetch('/api/staff/add', {
                           method: 'POST',
                           body: JSON.stringify({
                             name, role, instructions, 
                             persona: `${role} AI`, 
                             voice_gender: 'Female',
                             conversion_rate: 0,
                             rating: 5.0,
                             leads_closed: 0,
                             knowledge_graph: 'Vehicle Intelligence'
                           })
                         }).then(() => {
                           setIsAddingStaff(false);
                           window.location.reload();
                         });
                       }
                     }}
                     className="btn-primary px-10 py-3"
                   >
                     Initialize Agent
                   </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const renderView = (
  view, 
  data, 
  setCurrentView,
  onLeadClick, 
  selectedLead, 
  leadFilter, 
  setLeadFilter, 
  aiSettings, 
  setAiSettings, 
  serverIp, 
  user,
  selectedFeedback,
  setSelectedFeedback,
  selectedStaff,
  setSelectedStaff,
  onUpdateStaff,
  searchTerm,
  setSearchTerm,
  setSelectedService,
  setIsServiceModalOpen,
  selectedDate,
  setSelectedDate
) => {
  const { leads, service, calls, knowledge, staff, feedback } = data;
  
  // Deduplication logic: Keep only the latest entry for each Name + Phone pair
  const deduplicate = (list, key1, key2) => {
    const seen = new Set();
    return (list || []).filter(item => {
      const val1 = item[key1] || item['customer_name'] || item['customer'];
      const val2 = item[key2] || item['phone'];
      const id = `${val1}-${val2}`.toLowerCase();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  };

  const uniqueLeads = deduplicate(leads, 'customer_name', 'phone');
  const uniqueFeedback = deduplicate(feedback, 'customer_name', 'phone');

  const stats = {
    totalLeads: uniqueLeads.length,
    hotLeads: uniqueLeads.filter(l => l.priority === 'Hot').length,
    serviceDue: service?.filter(s => s.status === 'Due Soon' || s.status === 'Overdue').length || 0,
    aiCalls: calls?.length || 0
  };

  const performanceData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
    const dayLeads = (leads || []).filter(l => new Date(l.timestamp).getDay() === idx).length;
    return { name: day, leads: dayLeads };
  });

  const modelData = ['450X', '450S', 'Rizta', 'Apex'].map(model => ({
    name: model,
    value: leads.filter(l => (l.notes || "").toLowerCase().includes(model.toLowerCase())).length || 0
  })).filter(m => m.value > 0);

  const sentimentData = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => {
    const daySentiment = (calls || []).filter(c => new Date(c.timestamp).getDay() === idx).length;
    return { name: day, score: daySentiment || 0 };
  });

  const monthlyReportData = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((month, idx) => ({
    name: month,
    vol: (leads || []).filter(l => new Date(l.timestamp).getMonth() === idx).length
  }));

  switch(view) {
    case 'dashboard':
      return (
        <div className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Executive Overview</h1>
            <p className="text-slate-400">
              AI Intelligence for {knowledge?.business_info?.name || 'Ather Showroom'} | {knowledge?.business_info?.location || 'Bengaluru'}
            </p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard icon={Users} label="Active Enquiries" value={stats.totalLeads} trend="Live" colorClass="bg-primary/10 text-primary" />
            <KPICard icon={Zap} label="Hot Conversions" value={stats.hotLeads} trend="Live" colorClass="bg-rose-500/10 text-rose-500" />
            <KPICard icon={Wrench} label="Service Milestone Due" value={stats.serviceDue} trend="Live" colorClass="bg-amber-500/10 text-amber-500" />
            <KPICard icon={PhoneCall} label="AI Interactions" value={stats.aiCalls} trend="Live" colorClass="bg-blue-500/10 text-blue-500" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {stats.hotLeads > 0 && (
              <div className="col-span-12 lg:col-span-4 glass-card p-8 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
                <Badge type="success">AGENTIC ALLOTMENT</Badge>
                <h3 className="text-xl font-bold mt-4 mb-2 font-outfit">Auto-Assignment Complete</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  AI has automatically assigned {stats.hotLeads} priority leads to <b>{staff?.[0]?.name || 'Top Agent'}</b> based on conversion velocity.
                </p>
                <button className="btn-primary" onClick={() => setCurrentView('leads')}>
                  Monitor Assignments
                </button>
              </div>
            )}
            
            <div className={`col-span-12 ${stats.hotLeads > 0 ? 'lg:col-span-8' : ''} glass-card p-8`}>
              <Badge>KNOWLEDGE BASE</Badge>
              <h3 className="text-xl font-bold mt-4 mb-2 font-outfit">Product Intelligence</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Current active offers: {knowledge?.products?.map(p => p.current_offers).filter(Boolean).join(' | ') || 'No active promotions in KB.'}
              </p>
              <button className="btn-primary" onClick={() => setCurrentView('settings')}>Update KB</button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 glass-card p-8">
              <h3 className="text-lg font-bold mb-8 flex justify-between">
                Performance Velocity <BarChart3 size={18} className="text-slate-500" />
              </h3>
              <div className="h-[300px] min-h-[300px] w-full" style={{ minHeight: '300px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0}>
                  <AreaChart data={performanceData}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#20b2aa" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#20b2aa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="leads" stroke="#20b2aa" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass-card p-10 min-h-[400px]">
              <h3 className="text-xl font-bold mb-8 font-outfit">Model Interest Heatmap</h3>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={modelData}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {modelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={['var(--primary)', '#f43f5e', '#fbbf24', '#22c55e'][index % 4]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
           </div>
          </div>
        </div>
      );
    case 'leads':
      const filteredLeads = leadFilter === 'hot' ? leads.filter(l => l.priority === 'Hot') : leads;
      return (
        <div className="space-y-8">
           <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Lead Intelligence</h1>
            <p className="text-slate-400">Manage and analyze customer enquiries with AI lead scoring.</p>
          </header>
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/2">
               <div className="flex gap-4">
                  <button 
                    onClick={() => setLeadFilter('all')}
                    className={`btn-primary py-2 px-6 text-sm transition-all ${leadFilter === 'all' ? 'bg-primary' : 'bg-transparent border border-white/10 text-slate-400 hover:text-white'}`}
                  >
                    All Leads
                  </button>
                  <button 
                    onClick={() => setLeadFilter('hot')}
                    className={`btn-primary py-2 px-6 text-sm transition-all ${leadFilter === 'hot' ? 'bg-rose-500 shadow-rose-500/20' : 'bg-transparent border border-white/10 text-slate-400 hover:text-white hover:border-rose-500/50'}`}
                  >
                    Hot Priority
                  </button>
               </div>
               <div className="w-64 bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3 focus-within:border-primary/30 transition-all">
                  <Search size={16} className="text-slate-500" />
                  <input 
                    type="text" 
                    placeholder="Filter leads..." 
                    className="bg-transparent border-none outline-none w-full text-sm text-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/2">
                  <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                    <th className="px-8 py-4 font-bold">Customer</th>
                    <th className="px-8 py-4 font-bold">Assigned Agent</th>
                    <th className="px-8 py-4 font-bold">Intent Score</th>
                    <th className="px-8 py-4 font-bold">Priority</th>
                    <th className="px-8 py-4 font-bold">Status</th>
                    <th className="px-8 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(leadFilter === 'hot' ? uniqueLeads.filter(l => l.priority === 'Hot') : uniqueLeads).map(lead => (
                    <tr key={lead.id} className="hover:bg-white/2 transition-colors cursor-pointer group" onClick={() => onLeadClick(lead)}>
                      <td className="px-8 py-5">
                        <div className="font-bold group-hover:text-primary transition-colors">{lead.customer_name}</div>
                        <div className="text-[0.75rem] text-slate-500">{lead.phone}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-2">
                           <div className="w-6 h-6 rounded-lg bg-primary/20 flex items-center justify-center text-[0.6rem] font-bold text-primary">AI</div>
                           <span className="text-sm font-semibold">{lead.assigned_to || 'Auto-Allocating...'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: lead.priority === 'Hot' ? '90%' : lead.priority === 'Medium' ? '60%' : '30%' }}></div>
                          </div>
                          <span className="text-[0.75rem] font-bold">{lead.priority === 'Hot' ? '90%' : lead.priority === 'Medium' ? '60%' : '30%'}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge type={lead.priority.toLowerCase()}>{lead.priority}</Badge>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-sm text-slate-400">{lead.status}</span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button className="text-slate-500 hover:text-white"><MoreHorizontal size={18} /></button>
                      </td>
                    </tr>
                  ))}
                  {filteredLeads.length === 0 && (
                    <tr><td colSpan="6" className="px-8 py-20 text-center text-slate-500">No leads match the current filter.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    case 'leadDetail':
      return null; // Handled by Modal now
    case 'pipeline':
      const stages = ['New Enquiry', 'Contacted', 'Test Ride', 'Negotiation', 'Booking'];
      return (
        <div className="space-y-8">
           <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold font-outfit mb-2">Sales Pipeline</h1>
              <p className="text-slate-400">Visual deal workflow and conversion stages.</p>
            </div>
            <div className="w-80 bg-white/5 border border-white/5 rounded-2xl px-5 py-3 flex items-center gap-3 focus-within:border-primary/50 transition-all">
              <Search size={18} className="text-slate-500" />
              <input 
                type="text" 
                placeholder="Search pipeline..." 
                className="bg-transparent border-none outline-none w-full text-sm text-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </header>
          <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar">
            {stages.map(stage => {
              const stageLeads = uniqueLeads.filter(l => l.status === stage || (stage === 'New Enquiry' && l.status === 'New Enquiry'));
              return (
                <div key={stage} className="min-w-[320px] max-w-[320px] flex flex-col gap-4">
                  <div className="flex justify-between items-center px-2">
                    <h3 className="text-sm font-bold text-slate-400">{stage}</h3>
                    <span className="bg-white/5 px-2 py-1 rounded-md text-[0.7rem] font-bold">{stageLeads.length}</span>
                  </div>
                  <div className="flex flex-col gap-3 min-h-[500px] bg-white/2 p-4 rounded-3xl border border-white/5">
                    {stageLeads.map(lead => (
                      <motion.div 
                        key={lead.id} 
                        whileHover={{ scale: 1.02 }}
                        onClick={() => onLeadClick(lead)}
                        className="glass-card p-5 cursor-pointer"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-[0.95rem]">{lead.customer_name}</div>
                          <MoreHorizontal size={14} className="text-slate-500" />
                        </div>
                        <div className="text-[0.75rem] text-slate-400 mb-2">
                          Interest: <span className="text-primary font-bold">{['450X', '450S', 'Rizta', 'Apex'].find(m => lead.notes?.includes(m)) || 'Ather 450X'}</span>
                        </div>
                        <div className="flex items-center gap-2 mb-4">
                           <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center text-[0.5rem] font-bold text-slate-500">AI</div>
                           <span className="text-[0.7rem] font-bold text-slate-400">{lead.assigned_to}</span>
                        </div>
                        <div className="flex justify-between items-center border-t border-white/5 pt-3">
                           <span className="text-[0.65rem] text-slate-500 uppercase">{new Date(lead.timestamp).toLocaleDateString()}</span>
                           <Badge type={lead.priority === 'Hot' ? 'hot' : 'warm'}>{lead.priority}</Badge>
                        </div>
                      </motion.div>
                    ))}
                    {stageLeads.length === 0 && (
                      <div className="flex-1 border-2 border-dashed border-white/5 rounded-2xl flex items-center justify-center text-slate-600 text-sm">
                        No Deals
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    case 'followup':
      return (
        <div className="space-y-10">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold font-outfit mb-2">AI Follow-up Center</h1>
              <p className="text-slate-400 font-medium">Real-time voice agent intelligence and autonomous lead nurturing.</p>
            </div>
            <div className="flex gap-4">
               <div className="glass-card px-6 py-4 flex items-center gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                     <Brain size={20} />
                  </div>
                  <div>
                     <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Active Brains</div>
                     <div className="text-xl font-bold font-outfit">3 Agents</div>
                  </div>
               </div>
               <div className="glass-card px-6 py-4 flex items-center gap-4 border-emerald-500/20 bg-emerald-500/5">
                  <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center text-emerald-500">
                     <PhoneCall size={20} />
                  </div>
                  <div>
                     <div className="text-[0.6rem] font-bold text-slate-500 uppercase tracking-widest">Live Coverage</div>
                     <div className="text-xl font-bold font-outfit">94.2%</div>
                  </div>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 glass-card p-8">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-lg font-bold">Fleet Sentiment Intelligence</h3>
                 <div className="flex gap-2">
                    <div className="flex items-center gap-1 text-[0.65rem] font-bold text-emerald-500">
                       <div className="w-2 h-2 bg-emerald-500 rounded-full"></div> POSITIVE
                    </div>
                    <div className="flex items-center gap-1 text-[0.65rem] font-bold text-blue-500">
                       <div className="w-2 h-2 bg-blue-500 rounded-full"></div> NEUTRAL
                    </div>
                 </div>
              </div>
              <div className="h-[250px] min-h-[250px] w-full" style={{ minHeight: '250px' }}>
                <ResponsiveContainer width="100%" height="100%" minHeight={300} minWidth={0}>
                  <AreaChart data={sentimentData}>
                     <Area type="monotone" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass-card p-8 bg-gradient-to-br from-primary/10 to-transparent">
              <Badge>AI PERSUASION SCORE</Badge>
              <div className="text-6xl font-bold font-outfit mt-6 mb-2">8.4</div>
              <p className="text-slate-400 text-sm leading-relaxed">
                 Aggregate effectiveness of AI agents in converting cold leads into service appointments or showroom visits.
              </p>
              <div className="mt-8 pt-8 border-t border-white/5 flex gap-6">
                 <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Response Time</div>
                    <div className="text-xl font-bold font-outfit">{"< 2.0s"}</div>
                 </div>
                 <div>
                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Human Handover</div>
                    <div className="text-xl font-bold font-outfit">12%</div>
                 </div>
              </div>
            </div>
          </div>

          <div className="glass-card overflow-hidden">
             <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
                <h3 className="text-lg font-bold">Autonomous Interaction Log</h3>
                <button className="btn-primary py-2 px-4 text-xs flex items-center gap-2">
                   <Zap size={14} /> Bulk AI Follow-up
                </button>
             </div>
             <table className="w-full text-left">
                <thead className="bg-white/2">
                  <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                    <th className="px-8 py-4 font-bold">Interaction</th>
                    <th className="px-8 py-4 font-bold">Assigned Agent</th>
                    <th className="px-8 py-4 font-bold">Sentiment</th>
                    <th className="px-8 py-4 font-bold">Intelligence Summary</th>
                    <th className="px-8 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calls.map((call, idx) => (
                    <tr key={call.id || idx} className="hover:bg-white/2 transition-colors cursor-pointer" onClick={() => onLeadClick({ customer_name: call.customer_name || 'Unknown', phone: call.phone, priority: 'Medium', source: 'Voice', timestamp: call.timestamp, notes: call.summary })}>
                      <td className="px-8 py-5">
                         <div className="font-bold text-sm">{call.customer_name || 'Unknown'}</div>
                         <div className="text-[0.65rem] text-slate-500 mt-1">{new Date(call.timestamp).toLocaleString()}</div>
                      </td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-[0.6rem] font-bold">
                               {call.active_agent?.substring(0,2).toUpperCase() || 'AI'}
                            </div>
                            <span className="text-xs font-bold">{call.active_agent || 'Aura'}</span>
                         </div>
                      </td>
                      <td className="px-8 py-5">
                         <div className={`flex items-center gap-2 font-bold text-[0.7rem] uppercase tracking-tighter ${call.summary.toLowerCase().includes('interested') || call.summary.toLowerCase().includes('good') ? 'text-emerald-500' : 'text-blue-500'}`}>
                            <Smile size={14} /> {call.summary.toLowerCase().includes('interested') || call.summary.toLowerCase().includes('good') ? 'Positive' : 'Neutral'}
                         </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-400 max-w-xs truncate">{call.summary}</td>
                      <td className="px-8 py-5 text-right">
                         <button className="p-2 hover:bg-primary/10 rounded-lg text-primary transition-all">
                            <ArrowRight size={18} />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
             </table>
          </div>
        </div>
      );
    case 'service':
      return (
        <div className="space-y-10">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold font-outfit mb-2">Service Center</h1>
              <p className="text-slate-400 font-medium">Managing maintenance cycles and autonomous station allotment.</p>
            </div>
            <div className="flex gap-3">
               <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Station A: FREE</span>
               </div>
               <div className="px-4 py-2 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-widest">Station B: BUSY</span>
               </div>
               <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-emerald-500 uppercase tracking-widest">Station C: FREE</span>
               </div>
            </div>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard icon={Wrench} label="Total Service Records" value={service.length} colorClass="bg-blue-500/10 text-blue-500" />
            <KPICard icon={Clock} label="Avg. Service Time" value="2.4 Hrs" trend="-15%" colorClass="bg-primary/10 text-primary" />
            <KPICard icon={ShieldCheck} label="Autonomous Allotments" value={service.filter(s => s.service_type === 'Autonomous Allotment').length} colorClass="bg-emerald-500/10 text-emerald-500" />
          </div>

          <div className="glass-card overflow-hidden">
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-white/2">
               <h3 className="text-lg font-bold">All Service Appointments</h3>
               <div className="flex gap-4 items-center">
                  <span className="text-sm font-bold text-primary">Chronological Order</span>
               </div>
            </div>
            <table className="w-full text-left">
              <thead className="bg-white/2">
                <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                  <th className="px-8 py-4 font-bold">Appointment</th>
                  <th className="px-8 py-4 font-bold">Vehicle Info</th>
                  <th className="px-8 py-4 font-bold">Station</th>
                  <th className="px-8 py-4 font-bold">Type</th>
                  <th className="px-8 py-4 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[...(service || [])].sort((a, b) => {
                   const tA = new Date(`${a.appointment_date || '1970-01-01'} ${a.appointment_time || '00:00'}`).getTime();
                   const tB = new Date(`${b.appointment_date || '1970-01-01'} ${b.appointment_time || '00:00'}`).getTime();
                   return (isNaN(tA) ? 0 : tA) - (isNaN(tB) ? 0 : tB);
                }).map(s => (
                  <tr 
                    key={s.id} 
                    className="hover:bg-white/2 transition-colors cursor-pointer group"
                    onClick={() => {
                      setSelectedService(s);
                      setIsServiceModalOpen(true);
                    }}
                  >
                    <td className="px-8 py-5">
                       <div className="font-bold text-sm group-hover:text-primary transition-colors">{s.customer_name}</div>
                       <div className="text-[0.65rem] text-slate-500 flex items-center gap-1 mt-1">
                          <Clock size={10} /> {s.appointment_date || s.last_contact} | {s.appointment_time || 'TBD'}
                       </div>
                    </td>
                    <td className="px-8 py-5">
                       <div className="text-sm font-medium">{s.vehicle_no}</div>
                       <div className="text-[0.65rem] text-slate-500 uppercase tracking-tighter">{s.current_km} KM recorded</div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-primary">{s.station || 'Auto-Allotting...'}</td>
                    <td className="px-8 py-5">
                       <Badge type={s.service_type === 'Voice Booking' ? 'success' : 'default'}>{s.service_type}</Badge>
                    </td>
                    <td className="px-8 py-5 text-right flex justify-end gap-3 items-center">
                       <Badge type={s.status === 'Scheduled' ? 'success' : 'warm'}>{s.status}</Badge>
                       <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          if(confirm('Cancel this appointment?')) {
                            fetch('/api/service/delete', { method: 'POST', body: JSON.stringify({ id: s.id }) }).then(() => window.location.reload());
                          }
                        }}
                        className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                       >
                          <Trash2 size={16} />
                       </button>
                    </td>
                  </tr>
                ))}
                {((service || []).length === 0) && (
                  <tr>
                    <td colSpan="5" className="px-8 py-20 text-center text-slate-500 italic text-sm">
                       No appointments scheduled for this date.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      );
    case 'staff':
      return (
        <div className="space-y-10">
          <header className="flex justify-between items-end">
            <div>
              <h1 className="text-4xl font-bold font-outfit mb-2">Staff Management</h1>
              <p className="text-slate-400">Performance analysis and AI-assisted lead assignment.</p>
            </div>
            <button 
              onClick={() => setIsAddingStaff(true)}
              className="btn-primary flex items-center gap-2"
            >
              <Plus size={18} /> Create New AI Specialist
            </button>
          </header>
          <div className="glass-card p-8 border-primary/20 bg-primary/5">
             <Badge>ASSIGNMENT INTELLIGENCE</Badge>
             <h3 className="text-xl font-bold mt-4 mb-2 font-outfit">Agentic Workload Balance</h3>
             <p className="text-slate-400 text-sm leading-relaxed mb-6">
                AI is currently auto-allotting all incoming leads. <b>{staff?.[0]?.name || 'Staff'}</b> has been prioritized for high-intent conversion due to their {staff?.[0]?.conversion_rate || 0}% success rate.
             </p>
             <button className="btn-primary" onClick={() => setCurrentView('staff')}>Monitor Performance</button>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/2">
                <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                  <th className="px-8 py-4 font-bold">AI Agent Persona</th>
                  <th className="px-8 py-4 font-bold">Voice Model</th>
                  <th className="px-8 py-4 font-bold">Connected Knowledge</th>
                  <th className="px-8 py-4 font-bold">Conv. %</th>
                  <th className="px-8 py-4 font-bold text-right">Performance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(staff || []).map(s => (
                  <tr 
                    key={s.id} 
                    className="hover:bg-white/2 transition-colors cursor-pointer group"
                    onClick={() => setSelectedStaff(s)}
                  >
                    <td className="px-8 py-5">
                       <div className="font-bold text-sm group-hover:text-primary transition-colors flex items-center gap-2">
                          <Brain size={14} className="text-primary" /> {s.name}
                       </div>
                       <div className="text-[0.65rem] text-slate-500 italic mt-0.5">{s.persona}</div>
                    </td>
                    <td className="px-8 py-5">
                       <Badge type={s.voice_gender === 'Female' ? 'success' : 'default'}>
                          {s.voice_gender === 'Female' ? 'FEMALE (GIRL)' : 'MALE (BOY)'} | {s.voice_gender === 'Female' ? 'Priya' : (s.name === 'Zephyr' ? 'Kumar' : 'Mani')}
                       </Badge>
                    </td>
                    <td className="px-8 py-5">
                       <div className="flex items-center gap-2 text-[0.7rem] font-bold text-slate-400">
                          <Network size={12} className="text-primary" /> {s.knowledge_graph || 'Global Core'}
                       </div>
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-primary">{s.conversion_rate}%</td>
                    <td className="px-8 py-5 text-right font-bold text-amber-500">⭐ {s.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Persona Configuration Modal */}
          <AnimatePresence>
            {selectedStaff && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedStaff(null)}
                  className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                />
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0, x: 50 }}
                  animate={{ scale: 1, opacity: 1, x: 0 }}
                  exit={{ scale: 0.9, opacity: 0, x: 50 }}
                  className="glass-card w-full max-w-3xl p-12 relative z-10 border-primary/30 overflow-hidden shadow-2xl"
                >
                  <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 blur-[120px] rounded-full -mr-48 -mt-48"></div>
                  
                  <header className="flex justify-between items-start mb-10 relative">
                     <div>
                        <div className="flex items-center gap-2 mb-3">
                           <div className="w-2 h-2 bg-primary rounded-full animate-pulse shadow-[0_0_10px_rgba(32,178,170,1)]"></div>
                           <span className="text-[0.65rem] font-bold text-primary uppercase tracking-[0.3em]">AI Agent Configuration</span>
                        </div>
                        <h2 className="text-4xl font-bold font-outfit text-white mb-2">{selectedStaff.name} <span className="text-slate-600 font-normal text-2xl">| {selectedStaff.persona}</span></h2>
                        <p className="text-slate-400 text-sm">Managing behavior, vocal tonality, and task directives.</p>
                     </div>
                     <button onClick={() => setSelectedStaff(null)} className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                        <X size={24} className="text-slate-400" />
                     </button>
                  </header>

                  <div className="grid grid-cols-2 gap-10 relative">
                     <div className="space-y-8">
                        <div className="space-y-3">
                           <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest pl-1">Vocal Identity (Gender) | Sarvam bulbul:v2</label>
                           <div className="grid grid-cols-2 gap-3 p-1.5 bg-white/5 rounded-2xl border border-white/5">
                              <button 
                                onClick={() => setSelectedStaff({...selectedStaff, voice_gender: 'Male'})}
                                className={`py-3 rounded-xl text-xs font-bold transition-all ${selectedStaff.voice_gender === 'Male' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                MALE (BOY)
                              </button>
                              <button 
                                onClick={() => setSelectedStaff({...selectedStaff, voice_gender: 'Female'})}
                                className={`py-3 rounded-xl text-xs font-bold transition-all ${selectedStaff.voice_gender === 'Female' ? 'bg-primary text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                              >
                                FEMALE (GIRL)
                              </button>
                           </div>
                           <div className="text-[0.6rem] text-slate-500 font-bold uppercase tracking-wider pl-1">
                              Speaker: <span className="text-primary">{selectedStaff.voice_gender === 'Female' ? 'Priya' : (selectedStaff.name === 'Zephyr' ? 'Kumar' : 'Mani')}</span>
                           </div>
                        </div>

                        <div className="space-y-3">
                           <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest pl-1">Knowledge Graph Connection</label>
                           <div className="p-4 bg-white/2 rounded-2xl border border-white/5 flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
                              <div className="flex items-center gap-3">
                                 <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                                    <Network size={20} />
                                 </div>
                                 <div>
                                    <div className="text-sm font-bold">{selectedStaff.knowledge_graph}</div>
                                    <div className="text-[0.6rem] text-slate-500 uppercase">Synchronized & Active</div>
                                 </div>
                              </div>
                              <ChevronDown size={16} className="text-slate-600 group-hover:text-primary" />
                           </div>
                        </div>
                     </div>

                     <div className="space-y-4">
                        <label className="text-[0.65rem] font-bold text-slate-500 uppercase tracking-widest pl-1">Behavioral Instructions & Directives</label>
                        <textarea 
                           className="w-full h-48 bg-black/20 border border-white/5 rounded-2xl p-6 text-sm text-slate-300 leading-relaxed focus:border-primary/50 outline-none resize-none transition-all"
                           defaultValue={selectedStaff.instructions}
                           onChange={(e) => setSelectedStaff({...selectedStaff, instructions: e.target.value})}
                           placeholder="Describe how the AI should convey tasks and interact with customers..."
                        />
                        <div className="flex items-center gap-2 p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                           <Sparkles size={14} className="text-emerald-500" />
                           <span className="text-[0.7rem] text-emerald-500/80">AI will automatically adapt its tonality based on these directives.</span>
                        </div>
                     </div>
                  </div>

                  <div className="mt-12 flex gap-4 pt-8 border-t border-white/5">
                     <button className="flex-1 btn-primary py-4" onClick={async () => {
                        const success = await onUpdateStaff(selectedStaff);
                        if (success) {
                          alert(`Agent ${selectedStaff.name} has been recalibrated and brain state synchronized.`);
                          setSelectedStaff(null);
                        } else {
                          alert('Failed to synchronize agent brain. Check server connection.');
                        }
                     }}>Synchronize Agent Brain</button>
                     <button className="flex-1 btn-primary py-4 bg-white/5 border border-white/10 hover:bg-white/10" onClick={() => setSelectedStaff(null)}>Discard Changes</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    case 'feedback':
      return (
        <div className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Customer</h1>
            <p className="text-slate-400">Voice AI sentiment analysis and churn prediction.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard icon={Smile} label="Average Rating" value={(feedback.reduce((acc, f) => acc + f.rating, 0) / (feedback.length || 1)).toFixed(1)} colorClass="bg-primary/10 text-primary" />
            <KPICard icon={MessageSquare} label="Positive Sentiment" value={`${Math.round((feedback.filter(f => f.sentiment === 'Positive').length / (feedback.length || 1)) * 100)}%`} trend="Live" colorClass="bg-emerald-500/10 text-emerald-500" />
            <KPICard icon={AlertCircle} label="Churn Risk Alerts" value={feedback.filter(f => f.sentiment === 'Negative').length} colorClass="bg-rose-500/10 text-rose-500" />
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/2">
                <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                  <th className="px-8 py-4 font-bold">Customer</th>
                  <th className="px-8 py-4 font-bold">Rating</th>
                  <th className="px-8 py-4 font-bold">Sentiment</th>
                  <th className="px-8 py-4 font-bold">Summary</th>
                  <th className="px-8 py-4 font-bold text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {uniqueFeedback.map(f => (
                  <tr 
                    key={f.id} 
                    className="hover:bg-white/2 transition-colors cursor-pointer group"
                    onClick={() => setSelectedFeedback(f)}
                  >
                    <td className="px-8 py-5">
                       <div className="font-bold group-hover:text-primary transition-colors">{f.customer_name || f.customer}</div>
                       <div className="text-[0.65rem] text-slate-500">{f.phone}</div>
                    </td>
                    <td className="px-8 py-5 text-amber-500">
                      {'⭐'.repeat(f.sentiment === 'Positive' ? 5 : (f.sentiment === 'Negative' ? 1 : 3))}
                    </td>
                    <td className="px-8 py-5">
                       <Badge type={f.sentiment === 'Positive' ? 'success' : (f.sentiment === 'Negative' ? 'hot' : 'warm')}>{f.sentiment}</Badge>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-400 truncate max-w-xs">{f.summary || f.comment}</td>
                    <td className="px-8 py-5 text-right text-xs font-bold text-slate-500">{f.status || 'Verified'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Feedback Intelligence Detail Modal */}
          <AnimatePresence>
            {selectedFeedback && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSelectedFeedback(null)}
                  className="absolute inset-0 bg-black/80 backdrop-blur-md"
                />
                <motion.div 
                  initial={{ scale: 0.95, opacity: 0, y: 30 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 30 }}
                  className="glass-card w-full max-w-2xl p-10 relative z-10 border-primary/20 overflow-hidden shadow-2xl"
                >
                  <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 blur-[100px] rounded-full -mr-40 -mt-40"></div>
                  
                  <header className="flex justify-between items-start mb-8 relative">
                     <div className="flex flex-col gap-1">
                        <Badge type={selectedFeedback.sentiment === 'Positive' ? 'success' : 'hot'}>AI PREDICTED: {selectedFeedback.sentiment.toUpperCase()}</Badge>
                        <h2 className="text-3xl font-bold font-outfit mt-4 bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">{selectedFeedback.customer_name || selectedFeedback.customer}</h2>
                        <div className="text-[0.65rem] text-slate-500 mb-2">{selectedFeedback.phone}</div>
                        <div className="flex gap-1.5 mt-2">
                           {Array.from({ length: 5 }).map((_, i) => {
                             const score = selectedFeedback.sentiment === 'Positive' ? 5 : (selectedFeedback.sentiment === 'Negative' ? 1 : 3);
                             return <span key={i} className={`text-lg ${i < score ? 'text-amber-400' : 'text-slate-700'}`}>⭐</span>;
                           })}
                        </div>
                     </div>
                     <button 
                      onClick={() => setSelectedFeedback(null)}
                      className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/5"
                     >
                       <X size={20} className="text-slate-400" />
                     </button>
                  </header>

                  <div className="space-y-8 relative">
                     <div className="p-8 bg-gradient-to-br from-primary/10 to-transparent rounded-3xl border border-primary/20">
                        <div className="flex items-center gap-2 mb-4 text-[0.65rem] font-bold text-primary uppercase tracking-[0.2em]">
                           <Sparkles size={14} /> Interaction Key-Points
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed mb-6 italic">
                           "{selectedFeedback.summary || selectedFeedback.comment}"
                        </p>
                        <div className="grid grid-cols-2 gap-4">
                           <div className="p-4 bg-white/5 rounded-2xl">
                              <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-1">Source</div>
                              <div className="text-xs font-bold text-white uppercase">{selectedFeedback.source || 'Voice AI'}</div>
                           </div>
                           <div className="p-4 bg-white/5 rounded-2xl">
                              <div className="text-[0.6rem] font-bold text-slate-500 uppercase mb-1">Intelligence Date</div>
                              <div className="text-xs font-bold text-white">{selectedFeedback.timestamp ? new Date(selectedFeedback.timestamp).toLocaleDateString() : 'Real-time'}</div>
                           </div>
                        </div>
                        <div className="flex items-center gap-8 mb-6">
                           <div className="flex-1 h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: selectedFeedback.sentiment === 'Positive' ? '94%' : (selectedFeedback.sentiment === 'Neutral' ? '60%' : '28%') }}
                                className={`h-full ${selectedFeedback.sentiment === 'Positive' ? 'bg-emerald-500' : (selectedFeedback.sentiment === 'Neutral' ? 'bg-amber-500' : 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]')}`} 
                              />
                           </div>
                           <span className="font-bold font-outfit text-3xl text-white">
                              {selectedFeedback.sentiment === 'Positive' ? '94%' : (selectedFeedback.sentiment === 'Neutral' ? '60%' : '28%')}<span className="text-sm text-slate-500 font-normal ml-1">conf.</span>
                           </span>
                        </div>
                        <p className="text-sm text-slate-300 leading-relaxed italic border-l-2 border-primary/30 pl-4 py-1">
                          "The AI detected a primary emotional tone of <span className="font-bold text-primary">{selectedFeedback.tone || 'Neutral'}</span> across the conversation segment."
                        </p>
                     </div>

                     <div className="grid grid-cols-2 gap-6">
                        <div className="glass-card p-6 bg-white/2 border-white/5">
                           <label className="text-[0.6rem] font-bold text-slate-500 uppercase mb-3 block tracking-widest">Purchase Probability</label>
                           <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${selectedFeedback.purchase_probability === 'High' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : (selectedFeedback.purchase_probability === 'Medium' ? 'bg-amber-500' : 'bg-slate-500')}`}></div>
                              <span className="text-xl font-bold text-slate-200">{selectedFeedback.purchase_probability || 'Medium'}</span>
                           </div>
                        </div>
                        <div className="glass-card p-6 bg-white/2 border-white/5">
                           <label className="text-[0.6rem] font-bold text-slate-500 uppercase mb-3 block tracking-widest">AI Action Strategy</label>
                           <p className="text-sm font-semibold text-primary leading-relaxed">{selectedFeedback.recommendation || 'Follow up with customer to resolve pending queries.'}</p>
                        </div>
                     </div>

                     <div className="pt-6 border-t border-white/5 flex items-center justify-between">
                        <div>
                           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Predicted Churn Impact</h4>
                           <div className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${selectedFeedback.churn_risk === 'Critical' ? 'bg-rose-500 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.5)]' : (selectedFeedback.churn_risk === 'Low' ? 'bg-emerald-500' : 'bg-amber-500')}`}></div>
                              <span className="text-sm font-bold text-slate-200 uppercase">{selectedFeedback.churn_risk || 'Low'} RISK</span>
                           </div>
                        </div>
                        <div className="text-right">
                           <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Verified Status</h4>
                           <Badge type={selectedFeedback.status === 'Verified' ? 'success' : 'hot'}>{selectedFeedback.status}</Badge>
                        </div>
                     </div>
                  </div>

                  <div className="mt-10 flex gap-4">
                     <button className="flex-1 btn-primary py-4 bg-white/5 text-slate-500 border border-white/5 cursor-not-allowed opacity-50" disabled>Generate AI Response (Disabled)</button>
                     <button className="flex-1 btn-primary py-4" onClick={() => setSelectedFeedback(null)}>Close Insight</button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      );
    case 'reports':
      return (
        <div className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Global Reports</h1>
            <p className="text-slate-400">Enterprise-wide analytics and regional branch comparisons.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <KPICard icon={BarChart3} label="Active Leads" value={uniqueLeads.length} trend="Live" colorClass="bg-emerald-500/10 text-emerald-500" />
             <KPICard icon={Users} label="Pending Services" value={service.length} trend="Live" colorClass="bg-blue-500/10 text-blue-500" />
             <KPICard icon={Wrench} label="System Health" value="100%" trend="Optimal" colorClass="bg-primary/10 text-primary" />
          </div>
          <div className="glass-card p-10 min-h-[400px]">
              <div className="flex justify-between items-center mb-8">
                 <h3 className="text-xl font-bold font-outfit">Lead Conversion Velocity</h3>
                 <div className="flex gap-2">
                    <Badge type="success">+12% Growth</Badge>
                 </div>
              </div>
              <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={monthlyReportData}>
                    <defs>
                      <linearGradient id="colorVol" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                    <Tooltip contentStyle={{backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px'}} />
                    <Area type="monotone" dataKey="vol" stroke="var(--primary)" strokeWidth={3} fillOpacity={1} fill="url(#colorVol)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
           </div>
        </div>
      );
    case 'settings':
      return (
        <div className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">System Settings</h1>
            <p className="text-slate-400">Configure AI behavior, branch details, and SIP integrations.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="glass-card p-10 space-y-10">
                <div className="max-w-2xl">
                    <h3 className="text-xl font-bold mb-6 font-outfit">AI Agent Configuration</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center p-6 bg-white/2 rounded-2xl border border-white/5">
                          <div>
                            <div className="font-bold mb-1">Voice Agent Proactive Outreach</div>
                            <div className="text-sm text-slate-500">Allow AI to voluntarily call leads for offers.</div>
                          </div>
                          <div 
                            onClick={() => setAiSettings({...aiSettings, proactive: !aiSettings.proactive})}
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${aiSettings.proactive ? 'bg-primary' : 'bg-slate-700'}`}
                          >
                            <motion.div 
                              animate={{ x: aiSettings.proactive ? 26 : 4 }}
                              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                            />
                          </div>
                      </div>
                      <div className="flex justify-between items-center p-6 bg-white/2 rounded-2xl border border-white/5">
                          <div>
                            <div className="font-bold mb-1">Auto-assign Hot Leads</div>
                            <div className="text-sm text-slate-500">Automatically route priority leads to senior staff.</div>
                          </div>
                          <div 
                            onClick={() => setAiSettings({...aiSettings, autoAssign: !aiSettings.autoAssign})}
                            className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${aiSettings.autoAssign ? 'bg-primary' : 'bg-slate-700'}`}
                          >
                            <motion.div 
                              animate={{ x: aiSettings.autoAssign ? 26 : 4 }}
                              className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                            />
                          </div>
                      </div>
                    </div>
                </div>
                <button className="btn-primary" onClick={() => alert('Settings Saved to Cloud!')}>Save Changes</button>
              </div>
            </div>

            <div className="space-y-8">
              <div className="glass-card p-10 border-primary/20 bg-primary/5 h-full">
                <div className="flex items-center gap-3 mb-8">
                   <div className="p-3 rounded-xl bg-primary/20 text-primary">
                      <PhoneCall size={24} />
                   </div>
                   <h3 className="text-xl font-bold font-outfit">SIP Connection Hub</h3>
                </div>
                
                <p className="text-slate-400 text-sm mb-8 leading-relaxed">
                  Use these credentials in your <b>PortSIP</b> or <b>Zoiper</b> mobile app to connect to the 300-based calling system.
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Server IP</span>
                    <span className="font-mono text-primary font-bold">{serverIp}</span>
                  </div>
                  <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Port</span>
                    <span className="font-mono text-white">5060</span>
                  </div>
                  <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Username</span>
                    <span className="font-mono text-white">2000</span>
                  </div>
                  <div className="p-4 bg-black/20 rounded-xl border border-white/5 flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Password</span>
                    <span className="font-mono text-white">5678</span>
                  </div>
                  <div className="p-6 bg-primary/10 rounded-2xl border border-primary/20 mt-6 text-center">
                     <div className="text-xs font-bold text-primary uppercase mb-2">Dial to speak with AI</div>
                     <div className="text-3xl font-bold font-outfit text-white tracking-widest">3000</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    case 'profile':
      return (
        <div className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Profile Settings</h1>
            <p className="text-slate-400">Manage your administrator account and security preferences.</p>
          </header>
          
          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-8">
              <div className="glass-card p-10 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-primary to-accent mb-6 shadow-2xl flex items-center justify-center">
                  <Fingerprint size={64} className="text-white/20" />
                </div>
                <h3 className="text-2xl font-bold font-outfit mb-1">{user?.name || 'Administrator'}</h3>
                <p className="text-slate-500 text-sm mb-8">{user?.role || 'System Manager'}</p>
                <div className="w-full pt-6 border-t border-white/5 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Account ID</span>
                    <span className="font-mono text-slate-300">ATH-9921-X</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Security Level</span>
                    <span className="text-emerald-500 font-bold">L4 - Global</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-span-12 lg:col-span-8 space-y-8">
              <div className="glass-card p-10">
                <h3 className="text-xl font-bold mb-8 font-outfit">Personal Information</h3>
                <div className="grid grid-cols-2 gap-8">
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Full Name</label>
                      <input type="text" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 w-full text-sm text-white focus:border-primary/50 outline-none" defaultValue={user?.name || 'Alex Richardson'} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Email Address</label>
                      <input type="email" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 w-full text-sm text-white focus:border-primary/50 outline-none" defaultValue="admin@ather.energy" />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Role Title</label>
                      <input type="text" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 w-full text-sm text-white focus:border-primary/50 outline-none" defaultValue={user?.role || 'Showroom Manager'} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-widest pl-1">Contact Number</label>
                      <input type="text" className="bg-white/5 border border-white/5 rounded-xl px-4 py-3 w-full text-sm text-white focus:border-primary/50 outline-none" defaultValue="+91 90000 00000" />
                   </div>
                </div>
                <button className="btn-primary mt-10" onClick={() => alert('Profile Updated!')}>Update Profile</button>
              </div>
            </div>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <BrainCircuit size={64} className="text-slate-700 mb-6" />
          <h2 className="text-2xl font-bold mb-2">View Implementation Pending</h2>
          <p className="text-slate-500">The module is being optimized with high-fidelity React components.</p>
        </div>
      );
  }
};

export default App;
