import React, { useState, useEffect } from 'react';
import { 
  Zap, LayoutDashboard, Users, Columns4, PhoneCall, Wrench, 
  UserCog, MessageSquare, BarChart3, Settings, LogOut, 
  Search, Bell, HelpCircle, ChevronDown, Clock, Sparkles,
  AlertCircle, BrainCircuit, Mic, Smile, TrendingUp, MoreHorizontal,
  ShieldCheck, Fingerprint, Key, Lock
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

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
  const [selectedLead, setSelectedLead] = useState(null);
  const [leadFilter, setLeadFilter] = useState('all');
  const [data, setData] = useState({ leads: [], service: [], calls: [], knowledge: null, staff: [], feedback: [] });
  const [time, setTime] = useState(new Date().toLocaleTimeString());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date().toLocaleTimeString()), 1000);
    if (authState === 'dashboard') {
        fetchData();
        const poll = setInterval(fetchData, 5000);
        return () => { clearInterval(timer); clearInterval(poll); };
    }
    return () => clearInterval(timer);
  }, [authState]);

  const fetchData = async () => {
    try {
      const [leads, service, calls, knowledge, staff, feedback] = await Promise.all([
        fetch('/api/leads').then(r => r.json()),
        fetch('/api/service').then(r => r.json()),
        fetch('/api/calls').then(r => r.json()),
        fetch('/api/knowledge').then(r => r.json()),
        fetch('/api/staff').then(r => r.json()),
        fetch('/api/feedback').then(r => r.json())
      ]);
      setData({ leads, service, calls, knowledge, staff, feedback });
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
    setCurrentView('leadDetail');
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
        {/* Header */}
        <header className="h-[72px] px-10 border-b border-white/5 flex items-center justify-between bg-surface-main/80 backdrop-blur-xl z-40">
          <div className="flex items-center gap-8">
            <div className="w-[400px] bg-white/5 border border-white/5 rounded-xl px-4 py-2 flex items-center gap-3 focus-within:border-primary/50 transition-colors">
              <Search size={18} className="text-slate-500" />
              <input type="text" placeholder="Search leads, VIN, or customers..." className="bg-transparent border-none outline-none w-full text-sm" />
            </div>
            <div className="pl-8 border-l border-white/5 flex items-center gap-3">
              <Clock size={18} className="text-primary" />
              <span className="text-sm font-semibold text-slate-400">{time}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative cursor-pointer text-slate-400 hover:text-white transition-colors">
              <Bell size={22} />
              <div className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-rose-500 rounded-full border-2 border-surface-main"></div>
            </div>
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
                      <div className="nav-item text-xs py-2" onClick={() => setShowProfileMenu(false)}>
                        <UserCog size={14} /> Profile Settings
                      </div>
                      <div className="nav-item text-xs py-2" onClick={() => setShowProfileMenu(false)}>
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
              {renderView(currentView, data, handleLeadClick, selectedLead, leadFilter, setLeadFilter)}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

const renderView = (view, data, onLeadClick, selectedLead, leadFilter, setLeadFilter) => {
  const { leads, service, calls, knowledge, staff, feedback } = data;
  
  const stats = {
    totalLeads: leads?.length || 0,
    hotLeads: leads?.filter(l => l.priority === 'Hot').length || 0,
    serviceDue: service?.filter(s => s.status === 'Due Soon' || s.status === 'Overdue').length || 0,
    aiCalls: calls?.length || 0
  };

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
            <KPICard icon={Users} label="Active Enquiries" value={stats.totalLeads} trend={`+${stats.totalLeads * 5}%`} colorClass="bg-primary/10 text-primary" />
            <KPICard icon={Zap} label="Hot Conversions" value={stats.hotLeads} trend={`+${stats.hotLeads * 12}%`} colorClass="bg-rose-500/10 text-rose-500" />
            <KPICard icon={Wrench} label="Service Milestone Due" value={stats.serviceDue} trend="-2%" colorClass="bg-amber-500/10 text-amber-500" />
            <KPICard icon={PhoneCall} label="AI Interactions" value={stats.aiCalls} trend={`+${stats.aiCalls * 8}%`} colorClass="bg-blue-500/10 text-blue-500" />
          </div>

          <div className="grid grid-cols-12 gap-6">
            {stats.hotLeads > 0 && (
              <div className="col-span-12 lg:col-span-4 glass-card p-8 border-rose-500/20 bg-gradient-to-br from-rose-500/5 to-transparent relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 blur-3xl rounded-full"></div>
                <Badge type="hot">PRIORITY INSIGHT</Badge>
                <h3 className="text-xl font-bold mt-4 mb-2 font-outfit">Hot Lead Cluster Detected</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-6">
                  AI has identified {stats.hotLeads} high-probability leads. Recommended staff: 'Senior Sales' for immediate conversion.
                </p>
                <button className="btn-primary bg-rose-500 hover:bg-rose-600 shadow-rose-500/20" onClick={() => onLeadClick(leads.find(l => l.priority === 'Hot'))}>
                  Take Immediate Action
                </button>
              </div>
            )}
            
            <div className={`col-span-12 ${stats.hotLeads > 0 ? 'lg:col-span-8' : ''} glass-card p-8`}>
              <Badge>GROWTH STRATEGY</Badge>
              <h3 className="text-xl font-bold mt-4 mb-2 font-outfit">Inventory Forecast</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Based on current lead velocity, Ather 450S stock will likely deplete by next Thursday. Recommended restock: 15 units.
              </p>
              <button className="btn-primary">Approve Restock</button>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 glass-card p-8">
              <h3 className="text-lg font-bold mb-8 flex justify-between">
                Performance Velocity <BarChart3 size={18} className="text-slate-500" />
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'Mon', leads: 31, conv: 11 },
                    { name: 'Tue', leads: 40, conv: 22 },
                    { name: 'Wed', leads: 28, conv: 15 },
                    { name: 'Thu', leads: 51, conv: 32 },
                    { name: 'Fri', leads: 42, conv: 24 },
                    { name: 'Sat', leads: 60, conv: 30 },
                    { name: 'Sun', leads: stats.totalLeads * 10, conv: stats.hotLeads * 5 },
                  ]}>
                    <defs>
                      <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#20b2aa" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#20b2aa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#475569" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px', fontSize: '12px' }} />
                    <Area type="smooth" dataKey="leads" stroke="#20b2aa" fillOpacity={1} fill="url(#colorLeads)" strokeWidth={3} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass-card p-8">
              <h3 className="text-lg font-bold mb-8">Model Interest Split</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: '450X', value: 45 },
                        { name: '450S', value: 35 },
                        { name: 'Rizta', value: 20 },
                      ]}
                      innerRadius={80}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#20b2aa" />
                      <Cell fill="#10b981" />
                      <Cell fill="#3b82f6" />
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
                  <input type="text" placeholder="Filter..." className="bg-transparent border-none outline-none w-full text-sm" />
               </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-white/2">
                  <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                    <th className="px-8 py-4 font-bold">Customer</th>
                    <th className="px-8 py-4 font-bold">Source</th>
                    <th className="px-8 py-4 font-bold">Intent Score</th>
                    <th className="px-8 py-4 font-bold">Priority</th>
                    <th className="px-8 py-4 font-bold">Status</th>
                    <th className="px-8 py-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {(filteredLeads || []).map(lead => (
                    <tr key={lead.id} className="hover:bg-white/2 transition-colors cursor-pointer group" onClick={() => onLeadClick(lead)}>
                      <td className="px-8 py-5">
                        <div className="font-bold group-hover:text-primary transition-colors">{lead.customer_name}</div>
                        <div className="text-[0.75rem] text-slate-500">{lead.phone}</div>
                      </td>
                      <td className="px-8 py-5 text-sm">{lead.source || 'Voice'}</td>
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full bg-primary" style={{ width: lead.priority === 'Hot' ? '92%' : '45%' }}></div>
                          </div>
                          <span className="text-[0.75rem] font-bold">{lead.priority === 'Hot' ? '92%' : '45%'}</span>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <Badge type={lead.priority === 'Hot' ? 'hot' : 'warm'}>{lead.priority}</Badge>
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
      if (!selectedLead) return null;
      const leadCalls = calls.filter(c => c.phone === selectedLead.phone || c.customer_name === selectedLead.customer_name);
      return (
        <div className="space-y-10">
          <header className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-4 mb-4">
                <button onClick={() => setCurrentView('leads')} className="text-slate-500 hover:text-white flex items-center gap-2 text-sm transition-colors">
                   <ChevronDown size={18} className="rotate-90" /> Back to Leads
                </button>
              </div>
              <h1 className="text-4xl font-bold font-outfit mb-2">{selectedLead.customer_name}</h1>
              <p className="text-slate-400 flex items-center gap-2">
                <PhoneCall size={14} className="text-primary" /> {selectedLead.phone} | <span className="text-slate-600">{selectedLead.source}</span>
              </p>
            </div>
            <div className="flex gap-4">
               <button className="btn-primary py-2 px-5 text-sm bg-white/5 text-white border border-white/10">Edit Profile</button>
               <button className="btn-primary py-2 px-5 text-sm">Transfer Lead</button>
            </div>
          </header>

          <div className="grid grid-cols-12 gap-8">
            <div className="col-span-12 lg:col-span-4 space-y-6">
               <div className="glass-card p-8">
                  <h3 className="text-lg font-bold mb-6 font-outfit">Customer Intelligence</h3>
                  <div className="space-y-6">
                     <div>
                        <label className="text-[0.65rem] text-slate-500 uppercase block mb-1">Intent Score</label>
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                             <div className="h-full bg-primary" style={{ width: selectedLead.priority === 'Hot' ? '92%' : '45%' }}></div>
                          </div>
                          <span className="text-sm font-bold text-primary">{selectedLead.priority === 'Hot' ? '92%' : '45%'}%</span>
                        </div>
                     </div>
                     <div>
                        <label className="text-[0.65rem] text-slate-500 uppercase block mb-1">Priority</label>
                        <Badge type={selectedLead.priority.toLowerCase()}>{selectedLead.priority}</Badge>
                     </div>
                     <div>
                        <label className="text-[0.65rem] text-slate-500 uppercase block mb-1">Latest Note</label>
                        <p className="text-sm text-slate-300 leading-relaxed italic">"{selectedLead.notes || 'No recent notes.'}"</p>
                     </div>
                  </div>
               </div>

               <div className="glass-card p-8 border-primary/20 bg-primary/5">
                  <h3 className="text-lg font-bold mb-4 font-outfit flex items-center gap-2">
                    <Sparkles size={18} className="text-primary" /> AI Recommendation
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    Based on the latest call, the customer is <span className="text-primary font-bold">highly likely to buy</span> if a test ride is scheduled within 24 hours. 
                  </p>
                  <button className="btn-primary w-full mt-6 text-sm">Schedule Test Ride</button>
               </div>
            </div>

            <div className="col-span-12 lg:col-span-8 glass-card p-8">
               <h3 className="text-lg font-bold mb-8 font-outfit">Interaction Timeline</h3>
               <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-white/5">
                  {leadCalls.map((call, idx) => (
                    <div key={idx} className="relative pl-10">
                      <div className="absolute left-0 top-1.5 w-6 h-6 bg-surface-sidebar border-2 border-primary rounded-full flex items-center justify-center">
                        <div className="w-2 h-2 bg-primary rounded-full"></div>
                      </div>
                      <div className="flex justify-between items-start mb-2">
                        <div className="font-bold text-primary">AI Voice Call Interaction</div>
                        <span className="text-[0.7rem] text-slate-500 font-bold uppercase">{new Date(call.timestamp).toLocaleString()}</span>
                      </div>
                      <div className="bg-white/2 border border-white/5 rounded-2xl p-6">
                        <div className="flex items-center gap-3 mb-4">
                           <div className={`p-2 rounded-lg ${call.summary.toLowerCase().includes('interested') ? 'bg-emerald-500/10 text-emerald-500' : 'bg-blue-500/10 text-blue-500'}`}>
                             <Smile size={16} />
                           </div>
                           <span className="text-sm font-bold">Positive Sentiment Detected</span>
                        </div>
                        <div className="mb-6">
                          <label className="text-[0.65rem] text-slate-500 uppercase block mb-1">AI Summary</label>
                          <p className="text-sm text-slate-300 leading-relaxed">{call.summary}</p>
                        </div>
                        <div className="bg-surface-main/50 rounded-xl p-4 border border-white/5">
                           <label className="text-[0.65rem] text-slate-400 uppercase block mb-2 font-bold">Transcription Fragment</label>
                           <p className="text-xs text-slate-500 leading-loose line-clamp-3">
                              {call.transcript || "Transcription currently being processed for this interaction segment..."}
                           </p>
                           <button className="text-primary text-[0.7rem] font-bold mt-2 hover:underline">View Full Transcript</button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {leadCalls.length === 0 && (
                    <div className="text-center py-10 text-slate-500 text-sm italic">No call history found for this lead in the current session.</div>
                  )}
               </div>
            </div>
          </div>
        </div>
      );
    case 'pipeline':
      const stages = ['New Enquiry', 'Contacted', 'Test Ride', 'Negotiation', 'Booking'];
      return (
        <div className="space-y-8">
           <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Sales Pipeline</h1>
            <p className="text-slate-400">Visual deal workflow and conversion stages.</p>
          </header>
          <div className="flex gap-6 overflow-x-auto pb-10 no-scrollbar">
            {stages.map(stage => {
              const stageLeads = leads.filter(l => l.status === stage || (stage === 'New Enquiry' && l.status === 'New Enquiry'));
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
                        className="glass-card p-5 cursor-grab active:cursor-grabbing"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="font-bold text-[0.95rem]">{lead.customer_name}</div>
                          <MoreHorizontal size={14} className="text-slate-500" />
                        </div>
                        <div className="text-[0.75rem] text-slate-400 mb-4">
                          Interest: <span className="text-primary font-bold">Ather 450X</span>
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
           <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">AI Follow-up Center</h1>
            <p className="text-slate-400">Real-time voice agent intelligence and sentiment tracking.</p>
          </header>
          <div className="grid grid-cols-12 gap-6">
            <div className="col-span-12 lg:col-span-8 glass-card p-8">
              <h3 className="text-lg font-bold mb-8">Customer Sentiment Trend</h3>
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={[
                    { name: 'M', score: 70 },
                    { name: 'T', score: 85 },
                    { name: 'W', score: 68 },
                    { name: 'T', score: 82 },
                    { name: 'F', score: 90 },
                    { name: 'S', score: 85 },
                    { name: 'S', score: 88 },
                  ]}>
                     <Area type="monotone" dataKey="score" stroke="#10b981" fill="#10b981" fillOpacity={0.1} strokeWidth={4} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="col-span-12 lg:col-span-4 glass-card p-8 bg-gradient-to-br from-emerald-500/10 to-transparent">
              <Badge type="success">AI RECOVERY</Badge>
              <div className="text-5xl font-bold font-outfit mt-6 mb-2">88%</div>
              <p className="text-slate-400 text-sm">Missed calls successfully recovered by AI Voice Agent this week.</p>
            </div>
          </div>
          <div className="glass-card overflow-hidden">
             <table className="w-full text-left">
                <thead className="bg-white/2">
                  <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                    <th className="px-8 py-4 font-bold">Time</th>
                    <th className="px-8 py-4 font-bold">Customer</th>
                    <th className="px-8 py-4 font-bold">Sentiment</th>
                    <th className="px-8 py-4 font-bold">AI Summary</th>
                    <th className="px-8 py-4 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {calls.map(call => (
                    <tr key={call.id} className="hover:bg-white/2 transition-colors">
                      <td className="px-8 py-5 text-[0.8rem] text-slate-400">{new Date(call.timestamp).toLocaleTimeString()}</td>
                      <td className="px-8 py-5 font-bold text-sm">{call.customer_name || 'Unknown'}</td>
                      <td className="px-8 py-5">
                         <div className="flex items-center gap-2 text-emerald-500 font-bold text-sm">
                            <Smile size={16} /> Positive
                         </div>
                      </td>
                      <td className="px-8 py-5 text-sm text-slate-400 max-w-md truncate">{call.summary}</td>
                      <td className="px-8 py-5 text-right">
                         <Badge type={call.summary.toLowerCase().includes('discount') ? 'hot' : 'default'}>
                            {call.summary.toLowerCase().includes('discount') ? 'ESCALATE' : 'LOGGED'}
                         </Badge>
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
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Service Center</h1>
            <p className="text-slate-400">Monitoring vehicle maintenance milestones and service retention.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard icon={Wrench} label="Vehicles Due (7 days)" value={stats.serviceDue} colorClass="bg-amber-500/10 text-amber-500" />
            <KPICard icon={TrendingUp} label="Service Retention Rate" value="92%" trend="+2%" colorClass="bg-emerald-500/10 text-emerald-500" />
            <KPICard icon={AlertCircle} label="Missed Services" value="3" trend="-5%" colorClass="bg-rose-500/10 text-rose-500" />
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/2">
                <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                  <th className="px-8 py-4 font-bold">Customer</th>
                  <th className="px-8 py-4 font-bold">Vehicle No</th>
                  <th className="px-8 py-4 font-bold">Milestone</th>
                  <th className="px-8 py-4 font-bold">Status</th>
                  <th className="px-8 py-4 font-bold text-right">Risk Prediction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(service || []).map(r => (
                  <tr key={r.vehicle_no} className="hover:bg-white/2 transition-colors">
                    <td className="px-8 py-5 font-bold text-sm">{r.customer_name}</td>
                    <td className="px-8 py-5"><code className="text-xs text-slate-400">{r.vehicle_no}</code></td>
                    <td className="px-8 py-5 text-sm">{r.current_km} km / {r.service_type}</td>
                    <td className="px-8 py-5">
                       <Badge type={r.status === 'Due Soon' ? 'warm' : 'cold'}>{r.status}</Badge>
                    </td>
                    <td className="px-8 py-5 text-right font-bold text-[0.75rem]" style={{ color: r.status === 'Overdue' ? 'var(--color-hot)' : 'var(--color-accent)' }}>
                       {r.status === 'Overdue' ? 'High Churn Risk' : 'Healthy Retention'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case 'staff':
      return (
        <div className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Staff Management</h1>
            <p className="text-slate-400">Performance analysis and AI-assisted lead assignment.</p>
          </header>
          <div className="glass-card p-8 border-primary/20 bg-primary/5">
             <Badge>ASSIGNMENT INTELLIGENCE</Badge>
             <h3 className="text-xl font-bold mt-4 mb-2 font-outfit">Recommend Lead Reassignment</h3>
             <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Staff 'Rohan' has 4 pending test rides. AI suggests reassigning 2 new leads to 'Sneha' who has a 15% higher conversion rate for Ather 450S.
             </p>
             <button className="btn-primary">Auto-balance Workload</button>
          </div>
          <div className="glass-card overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-white/2">
                <tr className="text-[0.7rem] uppercase tracking-wider text-slate-500">
                  <th className="px-8 py-4 font-bold">Staff Name</th>
                  <th className="px-8 py-4 font-bold">Role</th>
                  <th className="px-8 py-4 font-bold">Closed</th>
                  <th className="px-8 py-4 font-bold">Conv. %</th>
                  <th className="px-8 py-4 font-bold text-right">Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {(staff || []).map(s => (
                  <tr key={s.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-8 py-5 font-bold text-sm">{s.name}</td>
                    <td className="px-8 py-5 text-[0.75rem] text-slate-500">{s.role}</td>
                    <td className="px-8 py-5 text-sm">{s.leads_closed}</td>
                    <td className="px-8 py-5 text-sm font-bold text-primary">{s.conversion_rate}%</td>
                    <td className="px-8 py-5 text-right font-bold text-amber-500">⭐ {s.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    case 'feedback':
      return (
        <div className="space-y-10">
          <header>
            <h1 className="text-4xl font-bold font-outfit mb-2">Customer Feedback</h1>
            <p className="text-slate-400">AI-powered sentiment analysis and churn prediction.</p>
          </header>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard icon={Smile} label="Average NPS" value="84" colorClass="bg-primary/10 text-primary" />
            <KPICard icon={MessageSquare} label="Positive Sentiment" value="78%" trend="+3%" colorClass="bg-emerald-500/10 text-emerald-500" />
            <KPICard icon={AlertCircle} label="Churn Risk Alerts" value="5" colorClass="bg-rose-500/10 text-rose-500" />
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
                {(feedback || []).map(f => (
                  <tr key={f.id} className="hover:bg-white/2 transition-colors">
                    <td className="px-8 py-5 font-bold text-sm">{f.customer}</td>
                    <td className="px-8 py-5 text-amber-500">{'⭐'.repeat(f.rating)}</td>
                    <td className="px-8 py-5">
                       <Badge type={f.sentiment === 'Positive' ? 'success' : 'hot'}>{f.sentiment}</Badge>
                    </td>
                    <td className="px-8 py-5 text-sm text-slate-400 truncate max-w-xs">{f.summary}</td>
                    <td className="px-8 py-5 text-right text-xs font-bold text-slate-500">{f.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
             <KPICard icon={BarChart3} label="Total Revenue (FY26)" value="₹ 5.2 Cr" trend="+18%" colorClass="bg-emerald-500/10 text-emerald-500" />
             <KPICard icon={Users} label="Units Sold" value="342" trend="+45" colorClass="bg-blue-500/10 text-blue-500" />
             <KPICard icon={Wrench} label="Service Revenue" value="₹ 18.4L" trend="+12%" colorClass="bg-primary/10 text-primary" />
          </div>
          <div className="glass-card p-8">
             <h3 className="text-lg font-bold mb-8">Monthly Revenue Trends</h3>
             <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Jan', rev: 31 }, { name: 'Feb', rev: 40 }, { name: 'Mar', rev: 28 },
                    { name: 'Apr', rev: 51 }, { name: 'May', rev: 42 }, { name: 'Jun', rev: 109 },
                    { name: 'Jul', rev: 100 }, { name: 'Aug', rev: 120 }, { name: 'Sep', rev: 110 },
                    { name: 'Oct', rev: 140 }, { name: 'Nov', rev: 160 }, { name: 'Dec', rev: 180 },
                  ]}>
                    <Bar dataKey="rev" fill="#20b2aa" radius={[10, 10, 0, 0]} />
                    <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                  </BarChart>
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
            <p className="text-slate-400">Configure AI behavior, branch details, and system integrations.</p>
          </header>
          <div className="glass-card p-10 space-y-10">
             <div className="max-w-2xl">
                <h3 className="text-xl font-bold mb-6 font-outfit">AI Agent Configuration</h3>
                <div className="space-y-4">
                   <div className="flex justify-between items-center p-6 bg-white/2 rounded-2xl border border-white/5">
                      <div>
                         <div className="font-bold mb-1">Voice Agent Proactive Outreach</div>
                         <div className="text-sm text-slate-500">Allow AI to voluntarily call leads for offers.</div>
                      </div>
                      <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                         <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                   </div>
                   <div className="flex justify-between items-center p-6 bg-white/2 rounded-2xl border border-white/5">
                      <div>
                         <div className="font-bold mb-1">Auto-assign Hot Leads</div>
                         <div className="text-sm text-slate-500">Automatically route priority leads to senior staff.</div>
                      </div>
                      <div className="w-12 h-6 bg-primary rounded-full relative cursor-pointer">
                         <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                      </div>
                   </div>
                </div>
             </div>
             <button className="btn-primary">Save Changes</button>
          </div>
        </div>
      );
    default:
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <BrainCircuit size={64} className="text-slate-700 mb-6" />
          <h2 className="text-2xl font-bold mb-2">View Implementation Pending</h2>
          <p className="text-slate-500">The '{view}' module is being optimized with high-fidelity React components.</p>
        </div>
      );
  }
};

export default App;
