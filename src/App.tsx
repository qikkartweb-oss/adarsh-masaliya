import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  Bot, 
  Calendar, 
  Send, 
  Users, 
  Settings, 
  LogOut, 
  QrCode, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  XCircle,
  Menu as MenuIcon,
  X,
  User,
  BarChart3,
  PieChart,
  TrendingUp,
  Clock,
  Phone,
  Shield,
  Globe,
  Mail,
  CheckCircle2 as CheckIcon,
  AlertCircle,
  ChevronRight,
  Search,
  Filter,
  Download,
  Share2,
  Bell,
  CreditCard,
  Lock,
  Smartphone,
  GripVertical
} from 'lucide-react';
import { motion, AnimatePresence, Reorder } from 'motion/react';
import { io } from 'socket.io-client';
import QRCode from 'qrcode';

const API_URL = import.meta.env.VITE_API_URL || '';

// --- Types ---
interface User {
  id: number;
  email: string;
}

interface Rule {
  id: number;
  keyword: string;
  reply: string;
  type: string;
}

interface Booking {
  id: number;
  customer_phone: string;
  booking_date: string;
  booking_time: string;
  created_at: string;
}

interface Message {
  id: number;
  phone: string;
  content: string;
  direction: 'inbound' | 'outbound';
  timestamp: string;
}

interface Contact {
  id: number;
  phone: string;
  name: string;
}

// --- Components ---

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    try {
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  });
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (token && !user) {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse user from localStorage");
        }
      }
    }
  }, [token, user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  if (!token) {
    return <AuthPage onAuth={(t, u) => { setToken(t); setUser(u); }} />;
  }

  return (
    <div className="flex h-screen bg-neutral-50 font-sans text-neutral-900 overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 lg:relative
        ${isSidebarOpen ? 'w-72' : 'w-20'} 
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        bg-white border-r border-neutral-200 transition-all duration-300 flex flex-col shadow-xl lg:shadow-none
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <MessageSquare size={24} />
            </div>
            {isSidebarOpen && <span className="font-black text-2xl tracking-tighter">WhatsAuto</span>}
          </div>
          <button onClick={() => setIsMobileMenuOpen(false)} className="lg:hidden p-2 text-neutral-400">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          <NavItem icon={<Bot size={20} />} label="Chatbot Builder" active={activeTab === 'chatbot'} onClick={() => { setActiveTab('chatbot'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          <NavItem icon={<MenuIcon size={20} />} label="Menu Bot" active={activeTab === 'menubot'} onClick={() => { setActiveTab('menubot'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          <NavItem icon={<Calendar size={20} />} label="Bookings" active={activeTab === 'bookings'} onClick={() => { setActiveTab('bookings'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          <NavItem icon={<Send size={20} />} label="Broadcast" active={activeTab === 'broadcast'} onClick={() => { setActiveTab('broadcast'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          <NavItem icon={<Users size={20} />} label="Contacts" active={activeTab === 'contacts'} onClick={() => { setActiveTab('contacts'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          <NavItem icon={<MessageSquare size={20} />} label="Team Inbox" active={activeTab === 'inbox'} onClick={() => { setActiveTab('inbox'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          <div className="pt-4 mt-4 border-t border-neutral-100">
            <NavItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} collapsed={!isSidebarOpen} />
          </div>
        </nav>

        <div className="p-4 border-t border-neutral-100 bg-neutral-50/50">
          <button onClick={handleLogout} className="flex items-center gap-3 w-full p-3 text-neutral-500 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold text-sm">
            <LogOut size={20} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-20 bg-white border-b border-neutral-200 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMobileMenuOpen(true)} className="lg:hidden p-2 hover:bg-neutral-100 rounded-xl transition-colors">
              <MenuIcon size={24} />
            </button>
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="hidden lg:flex p-2 hover:bg-neutral-100 rounded-xl transition-colors text-neutral-400">
              <MenuIcon size={20} />
            </button>
            <div className="h-6 w-px bg-neutral-200 hidden lg:block mx-2" />
            <h1 className="font-bold text-neutral-500 text-sm uppercase tracking-widest hidden sm:block">
              {activeTab.replace(/([A-Z])/g, ' $1').trim()}
            </h1>
          </div>
          
          <div className="flex items-center gap-3 lg:gap-6">
            <div className="hidden sm:flex flex-col items-end">
              <p className="text-sm font-black tracking-tight">{user?.email}</p>
              <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Premium Plan</p>
            </div>
            <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center border border-emerald-100 shadow-sm">
              <User size={20} className="text-emerald-600" />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-10">
          <div className="max-w-7xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'dashboard' && <Dashboard key="dashboard" user={user!} token={token} onNavigate={setActiveTab} />}
              {activeTab === 'chatbot' && <ChatbotBuilder key="chatbot" token={token} />}
              {activeTab === 'menubot' && <MenuChatbot key="menubot" token={token} />}
              {activeTab === 'bookings' && <BookingsList key="bookings" token={token} />}
              {activeTab === 'broadcast' && <BroadcastMarketing key="broadcast" token={token} />}
              {activeTab === 'contacts' && <ContactsList key="contacts" token={token} />}
              {activeTab === 'inbox' && <TeamInbox key="inbox" token={token} user={user!} />}
              {activeTab === 'settings' && <SettingsPage key="settings" user={user!} token={token} />}
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  );
};

// --- Menu Chatbot ---

interface Menu {
  id: number;
  name: string;
  welcome_text: string;
  is_main: number;
  enabled: number;
}

interface MenuOption {
  id: number;
  menu_id: number;
  trigger_number: string;
  label: string;
  reply_text: string;
  action_type: string;
  next_menu_id: number | null;
  order_index: number;
}

const MenuChatbot: React.FC<{ token: string }> = ({ token }) => {
  const [menus, setMenus] = useState<Menu[]>([]);
  const [selectedMenu, setSelectedMenu] = useState<Menu | null>(null);
  const [options, setOptions] = useState<MenuOption[]>([]);
  const [isAddingMenu, setIsAddingMenu] = useState(false);
  const [isAddingOption, setIsAddingOption] = useState(false);

  // Form states
  const [menuName, setMenuName] = useState('');
  const [welcomeText, setWelcomeText] = useState('');
  const [isMain, setIsMain] = useState(false);

  const [optTrigger, setOptTrigger] = useState('');
  const [optLabel, setOptLabel] = useState('');
  const [optReply, setOptReply] = useState('');
  const [optAction, setOptAction] = useState('text');
  const [optNextMenu, setOptNextMenu] = useState<string>('');

  useEffect(() => { fetchMenus(); }, []);
  useEffect(() => { if (selectedMenu) fetchOptions(selectedMenu.id); }, [selectedMenu]);

  const fetchMenus = async () => {
    const res = await fetch(API_URL + '/api/menus', { headers: { 'Authorization': `Bearer ${token}` } });
    setMenus(await res.json());
  };

  const fetchOptions = async (menuId: number) => {
    const res = await fetch(API_URL + `/api/menus/${menuId}/options`, { headers: { 'Authorization': `Bearer ${token}` } });
    setOptions(await res.json());
  };

  const handleAddMenu = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(API_URL + '/api/menus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: menuName, welcome_text: welcomeText, is_main: isMain, enabled: true })
    });
    if (res.ok) {
      setMenuName('');
      setWelcomeText('');
      setIsMain(false);
      setIsAddingMenu(false);
      fetchMenus();
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMenu) return;
    const res = await fetch(API_URL + `/api/menus/${selectedMenu.id}/options`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({
        trigger_number: optTrigger,
        label: optLabel,
        reply_text: optReply,
        action_type: optAction,
        next_menu_id: optAction === 'submenu' ? parseInt(optNextMenu) : null
      })
    });
    if (res.ok) {
      setOptTrigger('');
      setOptLabel('');
      setOptReply('');
      setOptAction('text');
      setOptNextMenu('');
      setIsAddingOption(false);
      fetchOptions(selectedMenu.id);
    }
  };

  const deleteMenu = async (id: number) => {
    if (!confirm('Are you sure? This will delete all options in this menu.')) return;
    await fetch(API_URL + `/api/menus/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (selectedMenu?.id === id) setSelectedMenu(null);
    fetchMenus();
  };

  const deleteOption = async (id: number) => {
    await fetch(API_URL + `/api/options/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    if (selectedMenu) fetchOptions(selectedMenu.id);
  };

  const handleReorder = async (newOptions: MenuOption[]) => {
    setOptions(newOptions);
    if (selectedMenu) {
      await fetch(API_URL + `/api/menus/${selectedMenu.id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ options: newOptions })
      });
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">Menu Chatbot</h2>
          <p className="text-neutral-500">Design interactive multi-level menus for your customers.</p>
        </div>
        <button onClick={() => setIsAddingMenu(true)} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg active:scale-95">
          <Plus size={20} />
          Create Menu
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Menu List */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-widest text-neutral-400 px-2">Your Menus</h3>
          {menus.map(m => (
            <div
              key={m.id}
              onClick={() => setSelectedMenu(m)}
              className={`p-4 rounded-2xl border cursor-pointer transition-all group relative ${selectedMenu?.id === m.id ? 'bg-emerald-50 border-emerald-500' : 'bg-white border-neutral-100 hover:border-neutral-200'}`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold">{m.name}</span>
                {m.is_main === 1 && <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase font-bold">Main</span>}
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteMenu(m.id); }}
                className="absolute -top-2 -right-2 bg-white border border-neutral-200 p-1.5 rounded-full text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all shadow-sm"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>

        {/* Menu Editor */}
        <div className="lg:col-span-3">
          {selectedMenu ? (
            <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
              <div className="p-8 border-b border-neutral-100 bg-neutral-50/50">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-2xl font-bold tracking-tight">{selectedMenu.name}</h3>
                    <p className="text-neutral-500 mt-1">{selectedMenu.welcome_text}</p>
                    <div className="flex gap-2 mt-4">
                      {selectedMenu.is_main === 0 && (
                        <button 
                          onClick={async () => {
                            await fetch(API_URL + `/api/menus/${selectedMenu.id}`, {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                              body: JSON.stringify({ ...selectedMenu, is_main: true })
                            });
                            fetchMenus();
                            setSelectedMenu({ ...selectedMenu, is_main: 1 });
                          }}
                          className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-600 px-3 py-1.5 rounded-lg font-bold transition-colors"
                        >
                          Set as Main Menu
                        </button>
                      )}
                    </div>
                  </div>
                  <button onClick={() => setIsAddingOption(true)} className="bg-neutral-900 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-neutral-800 transition-all">
                    <Plus size={16} /> Add Option
                  </button>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-inner">
                  <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest mb-4">Preview</p>
                  <div className="font-mono text-sm whitespace-pre-wrap bg-neutral-900 text-emerald-400 p-6 rounded-xl">
                    * {selectedMenu.name} *<br /><br />
                    {selectedMenu.welcome_text}<br /><br />
                    {options.map(o => (
                      <div key={o.id}>{o.trigger_number}️⃣ {o.label}</div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-8 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-lg font-bold">Menu Options</h4>
                  <p className="text-xs text-neutral-400 font-medium">Drag to reorder</p>
                </div>
                <Reorder.Group axis="y" values={options} onReorder={handleReorder} className="space-y-3">
                  {options.map(opt => (
                    <Reorder.Item 
                      key={opt.id} 
                      value={opt} 
                      className="flex items-center gap-4 p-4 bg-neutral-50 rounded-2xl border border-neutral-100 group cursor-grab active:cursor-grabbing hover:border-neutral-200 transition-colors"
                    >
                      <div className="text-neutral-300 group-hover:text-neutral-400 transition-colors">
                        <GripVertical size={20} />
                      </div>
                      <div className="w-10 h-10 bg-white border border-neutral-200 rounded-xl flex items-center justify-center font-bold text-lg">
                        {opt.trigger_number}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold">{opt.label}</p>
                        <p className="text-xs text-neutral-500 uppercase font-bold tracking-wider">{opt.action_type} action</p>
                      </div>
                      <button onClick={() => deleteOption(opt.id)} className="p-2 text-neutral-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </Reorder.Item>
                  ))}
                  {options.length === 0 && <p className="text-center text-neutral-400 py-10 italic">No options added yet.</p>}
                </Reorder.Group>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-neutral-400 bg-white rounded-3xl border border-neutral-200 border-dashed p-20 text-center">
              <Bot size={48} className="opacity-20 mb-4" />
              <h3 className="text-xl font-bold text-neutral-900 mb-2">Select a menu to edit</h3>
              <p className="max-w-xs">Choose a menu from the left or create a new one to start building your automated flow.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {isAddingMenu && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-lg rounded-3xl p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Create New Menu</h3>
                <button onClick={() => setIsAddingMenu(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddMenu} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-neutral-700">Menu Name</label>
                  <input type="text" value={menuName} onChange={(e) => setMenuName(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="e.g. Main Menu, Services" required />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-neutral-700">Welcome Message</label>
                  <textarea value={welcomeText} onChange={(e) => setWelcomeText(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-32 resize-none" placeholder="Welcome to our salon! Please choose an option:" required />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={isMain} onChange={(e) => setIsMain(e.target.checked)} className="w-5 h-5 rounded border-neutral-300 text-emerald-500 focus:ring-emerald-500" />
                  <label className="text-sm font-semibold text-neutral-700">Set as Main Menu (Triggers on 'hi')</label>
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg">Save Menu</button>
              </form>
            </motion.div>
          </div>
        )}

        {isAddingOption && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-lg rounded-3xl p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight">Add Menu Option</h3>
                <button onClick={() => setIsAddingOption(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors"><X size={24} /></button>
              </div>
              <form onSubmit={handleAddOption} className="space-y-6">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-semibold mb-2 text-neutral-700">Number</label>
                    <input type="text" value={optTrigger} onChange={(e) => setOptTrigger(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="1" required />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-semibold mb-2 text-neutral-700">Label</label>
                    <input type="text" value={optLabel} onChange={(e) => setOptLabel(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" placeholder="Book Appointment" required />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-neutral-700">Action Type</label>
                  <select value={optAction} onChange={(e) => setOptAction(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all">
                    <option value="text">Reply with Text</option>
                    <option value="submenu">Open Submenu</option>
                    <option value="booking">Start Booking Flow</option>
                    <option value="support">Talk to Support</option>
                    <option value="info">Business Info</option>
                  </select>
                </div>
                {optAction === 'submenu' ? (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-neutral-700">Select Submenu</label>
                    <select value={optNextMenu} onChange={(e) => setOptNextMenu(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all" required>
                      <option value="">Choose a menu...</option>
                      {menus.filter(m => m.id !== selectedMenu?.id).map(m => (
                        <option key={m.id} value={m.id}>{m.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold mb-2 text-neutral-700">Reply Message</label>
                    <textarea value={optReply} onChange={(e) => setOptReply(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-24 resize-none" placeholder="What should the bot say when this is selected?" required />
                  </div>
                )}
                <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg">Add Option</button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const NavItem: React.FC<{ icon: React.ReactNode, label: string, active: boolean, onClick: () => void, collapsed: boolean }> = ({ icon, label, active, onClick, collapsed }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-3 w-full p-3 rounded-xl transition-all ${active ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'text-neutral-500 hover:bg-neutral-100'}`}
  >
    {icon}
    {!collapsed && <span className="font-medium">{label}</span>}
  </button>
);

// --- Auth Page ---

const AuthPage: React.FC<{ onAuth: (token: string, user: User) => void }> = ({ onAuth }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const API_URL = import.meta.env.VITE_API_URL || '';
    const endpoint = `${API_URL}${isLogin ? '/api/auth/login' : '/api/auth/register'}`;
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const data = await res.json();
        if (res.ok) {
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          onAuth(data.token, data.user);
        } else {
          setError(data.message || 'Authentication failed');
        }
      } else {
        const text = await res.text();
        setError(`Server error (${res.status}): ${text.substring(0, 100)}... If you are on Netlify, this app requires a separate Node.js backend.`);
      }
    } catch (err) {
      setError('Connection failed. Please check if your backend server is running.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-neutral-50 p-6">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-3xl shadow-xl p-10 border border-neutral-100">
        <div className="flex justify-center mb-8">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
            <MessageSquare size={32} />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-center mb-2 tracking-tight">Welcome to WhatsAuto</h1>
        <p className="text-neutral-500 text-center mb-8">The ultimate WhatsApp automation for your business.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2 text-neutral-700">Email Address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="name@business.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold mb-2 text-neutral-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          {error && <p className="text-red-500 text-sm text-center font-medium">{error}</p>}
          <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-8 text-center">
          <button onClick={() => setIsLogin(!isLogin)} className="text-emerald-600 font-semibold hover:underline">
            {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// --- Dashboard ---

const Dashboard: React.FC<{ user: User, token: string, onNavigate: (tab: string) => void }> = ({ user, token, onNavigate }) => {
  const [status, setStatus] = useState('disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [stats, setStats] = useState({ rules: 0, bookings: 0, messages: 0, contacts: 0, campaigns: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;

    fetchStatus();
    fetchStats();

    const socket = io(API_URL || window.location.origin);
    socket.on(`qr-${user.id}`, async (qr) => {
      const url = await QRCode.toDataURL(qr);
      setQrCode(url);
      setStatus('waiting');
    });
    socket.on(`status-${user.id}`, (newStatus) => {
      setStatus(newStatus);
      if (newStatus === 'connected') setQrCode(null);
    });

    return () => { socket.disconnect(); };
  }, [user?.id]);

  const fetchStatus = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/whatsapp/status`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setStatus(data.status);
    } catch (e) {}
  };

  const fetchStats = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${API_URL}/api/stats`, { headers: { 'Authorization': `Bearer ${token}` } });
      const data = await res.json();
      setStats(data);
      setLoading(false);
    } catch (e) {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setStatus('connecting');
    const API_URL = import.meta.env.VITE_API_URL || '';
    await fetch(`${API_URL}/api/whatsapp/connect`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-1">Dashboard</h2>
          <p className="text-neutral-500 font-medium">Welcome back! Here's your business performance overview.</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-5 py-2.5 rounded-2xl border border-neutral-200 shadow-sm">
          <div className={`w-2.5 h-2.5 rounded-full ${status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-black uppercase tracking-widest text-neutral-600">{status}</span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={<MessageSquare size={24} className="text-blue-500" />} label="Total Messages" value={stats.messages} trend="+12%" />
        <StatCard icon={<Users size={24} className="text-emerald-500" />} label="Total Contacts" value={stats.contacts} trend="+5%" />
        <StatCard icon={<Calendar size={24} className="text-purple-500" />} label="Bookings" value={stats.bookings} trend="+8%" />
        <StatCard icon={<Send size={24} className="text-orange-500" />} label="Campaigns" value={stats.campaigns} trend="0%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Connection Card */}
        <div className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 lg:p-12 border border-neutral-200 shadow-sm relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          
          <div className="relative z-10 flex flex-col lg:flex-row items-center gap-12">
            <div className="flex-1 space-y-8">
              <div className="space-y-4">
                <h3 className="text-4xl font-black tracking-tighter leading-none">WhatsApp<br/>Connection</h3>
                <p className="text-neutral-500 font-medium leading-relaxed max-w-md">
                  Connect your business WhatsApp to unlock powerful automation, real-time replies, and marketing tools.
                </p>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FeatureItem icon={<Bot size={18} />} text="AI Auto Replies" />
                <FeatureItem icon={<Calendar size={18} />} text="Booking System" />
                <FeatureItem icon={<Send size={18} />} text="Bulk Broadcast" />
                <FeatureItem icon={<Users size={18} />} text="Team Inbox" />
              </div>

              {status !== 'connected' && (
                <button 
                  onClick={handleConnect} 
                  className="bg-neutral-900 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-neutral-800 transition-all flex items-center gap-4 active:scale-95 shadow-2xl shadow-neutral-200 group/btn"
                >
                  <QrCode size={24} className="group-hover/btn:rotate-12 transition-transform" />
                  Connect Now
                </button>
              )}
            </div>

            <div className="w-full lg:w-72 aspect-square bg-neutral-50 rounded-[2rem] border-2 border-dashed border-neutral-200 flex items-center justify-center overflow-hidden relative shadow-inner">
              {qrCode ? (
                <motion.img initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} src={qrCode} alt="QR Code" className="w-full h-full p-8" />
              ) : status === 'connected' ? (
                <div className="text-center p-8">
                  <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
                    <CheckIcon size={40} />
                  </div>
                  <p className="font-black text-emerald-600 uppercase tracking-widest text-sm">Connected</p>
                </div>
              ) : (
                <div className="text-center p-8 opacity-40">
                  <Smartphone size={48} className="mx-auto mb-4 text-neutral-400" />
                  <p className="text-xs font-bold uppercase tracking-widest">Ready to connect</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-[2.5rem] p-8 border border-neutral-200 shadow-sm flex flex-col">
          <h3 className="text-2xl font-black tracking-tighter mb-8">Quick Actions</h3>
          <div className="space-y-4 flex-1">
            <QuickAction icon={<Plus size={20} />} label="New Chatbot Rule" color="bg-blue-50 text-blue-600" onClick={() => onNavigate('chatbot')} />
            <QuickAction icon={<Send size={20} />} label="Start Campaign" color="bg-orange-50 text-orange-600" onClick={() => onNavigate('broadcast')} />
            <QuickAction icon={<Users size={20} />} label="Import Contacts" color="bg-emerald-50 text-emerald-600" onClick={() => onNavigate('contacts')} />
            <QuickAction icon={<Calendar size={20} />} label="View Bookings" color="bg-purple-50 text-purple-600" onClick={() => onNavigate('bookings')} />
          </div>
          <div className="mt-8 pt-8 border-t border-neutral-100">
            <div className="flex items-center justify-between text-sm font-bold text-neutral-400 uppercase tracking-widest">
              <span>System Status</span>
              <span className="text-emerald-500">Operational</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const FeatureItem: React.FC<{ icon: React.ReactNode, text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-3 text-neutral-600 font-bold text-sm">
    <div className="w-8 h-8 bg-neutral-100 rounded-lg flex items-center justify-center text-neutral-400">
      {icon}
    </div>
    <span>{text}</span>
  </div>
);

const QuickAction: React.FC<{ icon: React.ReactNode, label: string, color: string, onClick: () => void }> = ({ icon, label, color, onClick }) => (
  <button onClick={onClick} className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-neutral-50 transition-all group">
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center shadow-sm`}>
        {icon}
      </div>
      <span className="font-bold text-neutral-700">{label}</span>
    </div>
    <ChevronRight size={18} className="text-neutral-300 group-hover:text-neutral-900 transition-colors" />
  </button>
);

const StatCard: React.FC<{ icon: React.ReactNode, label: string, value: number, trend?: string }> = ({ icon, label, value, trend }) => (
  <div className="bg-white p-8 rounded-[2rem] border border-neutral-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
    <div className="flex justify-between items-start mb-6">
      <div className="w-14 h-14 bg-neutral-50 rounded-2xl flex items-center justify-center shadow-inner">
        {icon}
      </div>
      {trend && (
        <span className={`text-[10px] font-black px-2 py-1 rounded-full ${trend.startsWith('+') ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-400'}`}>
          {trend}
        </span>
      )}
    </div>
    <p className="text-neutral-500 font-bold text-xs uppercase tracking-widest mb-1">{label}</p>
    <h4 className="text-4xl font-black tracking-tighter">{value.toLocaleString()}</h4>
  </div>
);

// --- Chatbot Builder ---

const ChatbotBuilder: React.FC<{ token: string }> = ({ token }) => {
  const [rules, setRules] = useState<Rule[]>([]);
  const [keyword, setKeyword] = useState('');
  const [reply, setReply] = useState('');
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => { fetchRules(); }, []);

  const fetchRules = async () => {
    const res = await fetch(API_URL + '/api/rules', { headers: { 'Authorization': `Bearer ${token}` } });
    setRules(await res.json());
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(API_URL + '/api/rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ keyword, reply })
    });
    if (res.ok) {
      setKeyword('');
      setReply('');
      setIsAdding(false);
      fetchRules();
    }
  };

  const handleDelete = async (id: number) => {
    await fetch(API_URL + `/api/rules/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } });
    fetchRules();
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-black tracking-tight mb-2">Chatbot Builder</h2>
          <p className="text-neutral-500">Create smart automation rules for your business.</p>
        </div>
        <button onClick={() => setIsAdding(true)} className="bg-emerald-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100 active:scale-95">
          <Plus size={20} />
          Add Rule
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {rules.map((rule) => (
            <motion.div key={rule.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white p-6 rounded-3xl border border-neutral-200 shadow-sm group relative">
              <button onClick={() => handleDelete(rule.id)} className="absolute top-4 right-4 p-2 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all">
                <Trash2 size={18} />
              </button>
              <div className="mb-4">
                <span className="text-xs font-bold uppercase tracking-widest text-emerald-500 bg-emerald-50 px-2 py-1 rounded-lg">Keyword</span>
                <h4 className="text-xl font-bold mt-2">"{rule.keyword}"</h4>
              </div>
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-blue-500 bg-blue-50 px-2 py-1 rounded-lg">Reply</span>
                <p className="text-neutral-600 mt-2 leading-relaxed whitespace-pre-wrap">{rule.reply}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white w-full max-w-lg rounded-3xl p-10 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold tracking-tight">New Automation Rule</h3>
                <button onClick={() => setIsAdding(false)} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>
              <form onSubmit={handleAddRule} className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold mb-2 text-neutral-700">Keyword</label>
                  <input
                    type="text"
                    value={keyword}
                    onChange={(e) => setKeyword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="e.g. hi, menu, price"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2 text-neutral-700">Bot Reply</label>
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-32 resize-none"
                    placeholder="What should the bot say?"
                    required
                  />
                </div>
                <button type="submit" className="w-full bg-emerald-500 text-white py-4 rounded-2xl font-bold text-lg hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-100">
                  Save Rule
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// --- Bookings List ---

const BookingsList: React.FC<{ token: string }> = ({ token }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);

  useEffect(() => {
    fetch(API_URL + '/api/bookings', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setBookings);
  }, []);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div>
        <h2 className="text-4xl font-black tracking-tight mb-2">Bookings</h2>
        <p className="text-neutral-500">Manage all appointments booked through WhatsApp.</p>
      </div>

      <div className="bg-white rounded-3xl border border-neutral-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Customer</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Date</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Time</th>
              <th className="px-8 py-4 text-xs font-bold uppercase tracking-widest text-neutral-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {bookings.map((booking) => (
              <tr key={booking.id} className="hover:bg-neutral-50 transition-colors">
                <td className="px-8 py-6 font-semibold">{booking.customer_phone.split('@')[0]}</td>
                <td className="px-8 py-6 text-neutral-600">{booking.booking_date}</td>
                <td className="px-8 py-6 text-neutral-600">{booking.booking_time}</td>
                <td className="px-8 py-6">
                  <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold uppercase tracking-wider">Confirmed</span>
                </td>
              </tr>
            ))}
            {bookings.length === 0 && (
              <tr>
                <td colSpan={4} className="px-8 py-20 text-center text-neutral-400 italic">No bookings found yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
};

// --- Broadcast ---

const BroadcastMarketing: React.FC<{ token: string }> = ({ token }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [campaignName, setCampaignName] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeView, setActiveView] = useState<'compose' | 'history'>('compose');

  useEffect(() => {
    fetchContacts();
    fetchCampaigns();
  }, []);

  const fetchContacts = () => {
    fetch(API_URL + '/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setContacts);
  };

  const fetchCampaigns = () => {
    fetch(API_URL + '/api/campaigns', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setCampaigns);
  };

  const handleSend = async () => {
    if (selected.length === 0 || !message || !campaignName) return;
    setIsSending(true);
    
    // Create campaign first
    const res = await fetch(API_URL + '/api/campaigns', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ name: campaignName, content: message })
    });
    const campaign = await res.json();

    // Send it
    await fetch(API_URL + `/api/campaigns/${campaign.id}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ phones: selected })
    });

    setIsSending(false);
    setMessage('');
    setCampaignName('');
    setSelected([]);
    fetchCampaigns();
    alert('Broadcast campaign started!');
  };

  const toggleSelect = (phone: string) => {
    setSelected(prev => prev.includes(phone) ? prev.filter(p => p !== phone) : [...prev, phone]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">Broadcast</h2>
          <p className="text-neutral-500 font-medium">Reach your customers with targeted marketing campaigns.</p>
        </div>
        <div className="flex bg-white p-1 rounded-2xl border border-neutral-200 shadow-sm">
          <button 
            onClick={() => setActiveView('compose')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeView === 'compose' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            Compose
          </button>
          <button 
            onClick={() => setActiveView('history')}
            className={`px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${activeView === 'history' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            History
          </button>
        </div>
      </div>

      {activeView === 'compose' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-neutral-200 shadow-sm">
              <h3 className="text-2xl font-black tracking-tighter mb-8">New Campaign</h3>
              <div className="space-y-6">
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">Campaign Name</label>
                  <input
                    type="text"
                    value={campaignName}
                    onChange={(e) => setCampaignName(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold"
                    placeholder="e.g., Summer Sale 2024"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase tracking-widest text-neutral-400 mb-3">Message Content</label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="w-full px-6 py-4 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all h-48 resize-none font-medium"
                    placeholder="Write your announcement here..."
                  />
                </div>
                <div className="flex justify-between items-center pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                      <Users size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight">{selected.length} Recipients</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Selected from contacts</p>
                    </div>
                  </div>
                  <button
                    onClick={handleSend}
                    disabled={isSending || selected.length === 0 || !campaignName || !message}
                    className="bg-emerald-500 text-white px-10 py-5 rounded-2xl font-black text-lg hover:bg-emerald-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-emerald-100 flex items-center gap-3 active:scale-95"
                  >
                    {isSending ? 'Sending...' : <><Send size={20} /> Launch Campaign</>}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm flex flex-col h-[600px]">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black tracking-tighter">Recipients</h3>
              <button onClick={() => setSelected(contacts.map(c => c.phone))} className="text-xs font-black text-emerald-600 hover:underline uppercase tracking-widest">Select All</button>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
              {contacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => toggleSelect(contact.phone)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all flex items-center justify-between group ${selected.includes(contact.phone) ? 'border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-50' : 'border-neutral-100 hover:border-neutral-200'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${selected.includes(contact.phone) ? 'bg-emerald-500 text-white' : 'bg-neutral-100 text-neutral-400 group-hover:bg-neutral-200'}`}>
                      {contact.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-sm">{contact.name}</p>
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{contact.phone.split('@')[0]}</p>
                    </div>
                  </div>
                  {selected.includes(contact.phone) && <CheckIcon size={18} className="text-emerald-500" />}
                </div>
              ))}
              {contacts.length === 0 && (
                <div className="text-center py-20 opacity-40">
                  <Users size={48} className="mx-auto mb-4 text-neutral-300" />
                  <p className="text-sm font-bold uppercase tracking-widest">No contacts yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Campaign</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Sent To</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Date</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-neutral-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="font-black tracking-tight text-neutral-800">{c.name}</p>
                    <p className="text-xs text-neutral-400 truncate max-w-xs">{c.content}</p>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-bold text-neutral-600">{c.sent_count} recipients</span>
                  </td>
                  <td className="px-8 py-6 text-sm text-neutral-500 font-medium">
                    {new Date(c.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${c.status === 'sent' ? 'bg-emerald-50 text-emerald-600' : 'bg-orange-50 text-orange-600'}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {campaigns.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center opacity-40">
                    <TrendingUp size={48} className="mx-auto mb-4 text-neutral-300" />
                    <p className="text-sm font-bold uppercase tracking-widest">No campaign history</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
};

// --- Settings Page ---

const SettingsPage: React.FC<{ user: User, token: string }> = ({ user, token }) => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-10 pb-20">
      <div>
        <h2 className="text-4xl font-black tracking-tighter mb-2">Settings</h2>
        <p className="text-neutral-500 font-medium">Manage your account, business profile, and preferences.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          {/* Profile Section */}
          <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <h3 className="text-2xl font-black tracking-tighter mb-8 flex items-center gap-3">
              <User size={24} className="text-emerald-500" />
              Profile Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Email Address</label>
                <div className="px-6 py-4 bg-neutral-50 rounded-2xl border border-neutral-100 text-neutral-500 font-bold">
                  {user.email}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Account Type</label>
                <div className="px-6 py-4 bg-emerald-50 rounded-2xl border border-emerald-100 text-emerald-600 font-black flex items-center gap-2">
                  <Shield size={16} />
                  Premium Business
                </div>
              </div>
            </div>
          </div>

          {/* Security Section */}
          <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <h3 className="text-2xl font-black tracking-tighter mb-8 flex items-center gap-3">
              <Lock size={24} className="text-blue-500" />
              Security
            </h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-6 bg-neutral-50 rounded-3xl border border-neutral-100">
                <div>
                  <p className="font-black tracking-tight">Two-Factor Authentication</p>
                  <p className="text-xs text-neutral-500 font-medium">Add an extra layer of security to your account.</p>
                </div>
                <div className="w-12 h-6 bg-neutral-200 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                </div>
              </div>
              <button className="text-emerald-600 font-black text-sm hover:underline">Change Password</button>
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Subscription Card */}
          <div className="bg-neutral-900 text-white p-8 rounded-[2.5rem] shadow-2xl shadow-neutral-200 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/20 rounded-full -mr-16 -mt-16 blur-2xl" />
            <h3 className="text-xl font-black mb-6 relative z-10">Subscription</h3>
            <div className="space-y-6 relative z-10">
              <div>
                <p className="text-neutral-400 text-xs font-bold uppercase tracking-widest mb-1">Current Plan</p>
                <p className="text-2xl font-black tracking-tight">Professional</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-neutral-400">Messages Used</span>
                  <span>8,420 / 10,000</span>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 w-[84%]" />
                </div>
              </div>
              <button className="w-full bg-white text-neutral-900 py-4 rounded-2xl font-black text-sm hover:bg-neutral-100 transition-all active:scale-95">
                Upgrade Plan
              </button>
            </div>
          </div>

          {/* Support Card */}
          <div className="bg-white p-8 rounded-[2.5rem] border border-neutral-200 shadow-sm">
            <h3 className="text-xl font-black mb-6">Need Help?</h3>
            <div className="space-y-4">
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-neutral-50 transition-all text-left group">
                <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                  <Globe size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Documentation</p>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">View Guides</p>
                </div>
              </button>
              <button className="w-full flex items-center gap-4 p-4 rounded-2xl hover:bg-neutral-50 transition-all text-left group">
                <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="font-bold text-sm">Contact Support</p>
                  <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest">Get Assistance</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// --- Contacts List ---

const ContactsList: React.FC<{ token: string }> = ({ token }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = () => {
    fetch(API_URL + '/api/contacts', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(setContacts);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this contact?')) return;
    await fetch(API_URL + `/api/contacts/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    fetchContacts();
  };

  const filtered = contacts.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.phone.includes(search)
  );

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-4xl font-black tracking-tighter mb-2">Contacts</h2>
          <p className="text-neutral-500 font-medium">Manage your customer database and interaction history.</p>
        </div>
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts..."
              className="w-full pl-12 pr-6 py-3 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-sm"
            />
          </div>
          <button className="bg-neutral-900 text-white p-3 rounded-2xl hover:bg-neutral-800 transition-all shadow-lg shadow-neutral-200">
            <Plus size={24} />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-neutral-50/50 border-b border-neutral-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Customer</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Phone Number</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-50">
              {filtered.map((contact) => (
                <tr key={contact.id} className="hover:bg-neutral-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-sm">
                        {contact.name[0]}
                      </div>
                      <span className="font-black tracking-tight text-neutral-800 text-lg">{contact.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className="font-bold text-neutral-500 font-mono">{contact.phone.split('@')[0]}</span>
                  </td>
                  <td className="px-8 py-6">
                    <button 
                      onClick={() => handleDelete(contact.id)}
                      className="p-3 text-neutral-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-8 py-20 text-center opacity-40">
                    <Users size={48} className="mx-auto mb-4 text-neutral-300" />
                    <p className="text-sm font-bold uppercase tracking-widest">No contacts found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};

// --- Team Inbox ---

const TeamInbox: React.FC<{ token: string, user: User }> = ({ token, user }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedPhone, setSelectedPhone] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    const interval = setInterval(fetchMessages, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, selectedPhone]);

  const fetchMessages = async () => {
    const res = await fetch(API_URL + '/api/messages', { headers: { 'Authorization': `Bearer ${token}` } });
    setMessages(await res.json());
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPhone || !replyText) return;
    const res = await fetch(API_URL + '/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ phone: selectedPhone, content: replyText })
    });
    if (res.ok) {
      setReplyText('');
      fetchMessages();
    }
  };

  const uniqueChats = Array.from(new Set(messages.map(m => m.phone)));
  const chatMessages = messages.filter(m => m.phone === selectedPhone).reverse();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-12rem)] flex gap-8">
      {/* Chat List */}
      <div className="w-full lg:w-96 bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm flex flex-col overflow-hidden">
        <div className="p-8 border-b border-neutral-100 bg-neutral-50/50">
          <h3 className="text-2xl font-black tracking-tighter">Conversations</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar">
          {uniqueChats.map((phone) => {
            const lastMsg = messages.find(m => m.phone === phone);
            return (
              <button
                key={phone}
                onClick={() => setSelectedPhone(phone)}
                className={`w-full p-6 rounded-3xl text-left transition-all border-2 ${selectedPhone === phone ? 'bg-emerald-50 border-emerald-500 shadow-lg shadow-emerald-50' : 'border-transparent hover:bg-neutral-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <p className="font-black text-neutral-900">{(phone as string).split('@')[0]}</p>
                  <span className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">
                    {lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-sm text-neutral-500 truncate font-medium">{lastMsg?.content}</p>
              </button>
            );
          })}
          {uniqueChats.length === 0 && (
            <div className="text-center py-20 opacity-40">
              <MessageSquare size={48} className="mx-auto mb-4 text-neutral-300" />
              <p className="text-sm font-bold uppercase tracking-widest">No messages yet</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="hidden lg:flex flex-1 bg-white rounded-[2.5rem] border border-neutral-200 shadow-sm flex-col overflow-hidden relative">
        {selectedPhone ? (
          <>
            <div className="p-8 border-b border-neutral-100 flex items-center justify-between bg-white z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black text-xl shadow-lg shadow-emerald-100">
                  {selectedPhone[0]}
                </div>
                <div>
                  <p className="font-black text-xl tracking-tighter">{selectedPhone.split('@')[0]}</p>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                    <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">Active Now</p>
                  </div>
                </div>
              </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-10 space-y-6 bg-neutral-50/30 custom-scrollbar">
              {chatMessages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] p-6 rounded-[2rem] shadow-sm ${msg.direction === 'outbound' ? 'bg-neutral-900 text-white rounded-tr-none' : 'bg-white text-neutral-800 rounded-tl-none border border-neutral-100'}`}>
                    <p className="leading-relaxed font-medium">{msg.content}</p>
                    <p className={`text-[10px] mt-3 font-black uppercase tracking-widest opacity-40 ${msg.direction === 'outbound' ? 'text-white' : 'text-neutral-500'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-8 border-t border-neutral-100 bg-white">
              <form onSubmit={handleSendReply} className="flex gap-4">
                <input
                  type="text"
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-8 py-5 rounded-2xl border border-neutral-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-medium"
                  placeholder="Type your message..."
                />
                <button type="submit" className="bg-emerald-500 text-white p-5 rounded-2xl hover:bg-emerald-600 transition-all shadow-2xl shadow-emerald-100 active:scale-95">
                  <Send size={28} />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-neutral-400 p-10 text-center">
            <div className="w-32 h-32 bg-neutral-50 rounded-[2.5rem] flex items-center justify-center mb-8 shadow-inner">
              <MessageSquare size={64} className="opacity-20" />
            </div>
            <h3 className="text-2xl font-black text-neutral-900 tracking-tighter mb-2">Select a conversation</h3>
            <p className="max-w-xs font-medium text-neutral-500">Choose a chat from the left to start replying to your customers in real-time.</p>
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default App;
