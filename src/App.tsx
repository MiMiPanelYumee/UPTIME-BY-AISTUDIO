import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { Activity, Zap, AlertTriangle, CheckCircle2, Settings, Plus, Trash2, Clock, Server } from 'lucide-react';
import { format } from 'date-fns';
import axios from 'axios';

// Types
interface URLData {
  id: number;
  url: string;
  name: string;
  status: string;
  last_ping: number;
  uptime_percent: number;
  total_pings: number;
  successful_pings: number;
}

interface HistoryData {
  id: number;
  url_id: number;
  timestamp: number;
  status: string;
  response_time: number;
}

interface Settings {
  telegram_bot_token: string;
  telegram_chat_id: string;
}

export default function App() {
  const [urls, setUrls] = useState<URLData[]>([]);
  const [selectedUrl, setSelectedUrl] = useState<URLData | null>(null);
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [settings, setSettings] = useState<Settings>({ telegram_bot_token: '', telegram_chat_id: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [newUrl, setNewUrl] = useState('');
  const [newName, setNewName] = useState('');

  // Fetch Data
  const fetchData = async () => {
    try {
      const res = await axios.get('/api/urls');
      setUrls(res.data);
      if (!selectedUrl && res.data.length > 0) {
        setSelectedUrl(res.data[0]);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchHistory = async (id: number) => {
    try {
      const res = await axios.get(`/api/history/${id}`);
      setHistory(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSettings = async () => {
    try {
      const res = await axios.get('/api/settings');
      setSettings(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchData();
    fetchSettings();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (selectedUrl) {
      fetchHistory(selectedUrl.id);
      const interval = setInterval(() => fetchHistory(selectedUrl.id), 5000);
      return () => clearInterval(interval);
    }
  }, [selectedUrl]);

  // Actions
  const handleAddUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUrl || !newName) return;
    try {
      await axios.post('/api/urls', { url: newUrl, name: newName });
      setNewUrl('');
      setNewName('');
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteUrl = async (id: number) => {
    try {
      await axios.delete(`/api/urls/${id}`);
      if (selectedUrl?.id === id) setSelectedUrl(null);
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.post('/api/settings', settings);
      setShowSettings(false);
    } catch (e) {
      console.error(e);
    }
  };

  // Chart Data
  const chartData = history.map(h => ({
    time: format(new Date(h.timestamp), 'HH:mm:ss'),
    responseTime: h.response_time,
    status: h.status,
    isError: h.status === 'ERROR'
  }));

  return (
    <div className="min-h-screen bg-[#0a0514] text-white font-mono p-4 md:p-8 selection:bg-fuchsia-500/30">
      {/* Header */}
      <header className="flex justify-between items-center mb-8 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Zap className="w-8 h-8 text-[#00ffcc]" />
            <div className="absolute inset-0 bg-[#00ffcc] blur-xl opacity-50 rounded-full"></div>
          </div>
          <h1 className="text-2xl font-bold tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#00ffcc] to-[#ff00ff]">
            Yumee Panels
          </h1>
        </div>
        <button 
          onClick={() => setShowSettings(!showSettings)}
          className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors border border-white/10 hover:border-[#00ffcc]/50 hover:shadow-[0_0_15px_rgba(0,255,204,0.3)]"
        >
          <Settings className="w-5 h-5 text-gray-400 hover:text-[#00ffcc]" />
        </button>
      </header>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#110a22] border border-[#ff00ff]/30 p-6 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(255,0,255,0.1)]">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2 text-[#ff00ff]">
              <Settings className="w-5 h-5" /> Telegram Integration
            </h2>
            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Bot Token</label>
                <input 
                  type="text" 
                  value={settings.telegram_bot_token}
                  onChange={e => setSettings({...settings, telegram_bot_token: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-[#00ffcc] focus:ring-1 focus:ring-[#00ffcc]"
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                />
              </div>
              <div>
                <label className="block text-xs uppercase text-gray-400 mb-1">Chat ID</label>
                <input 
                  type="text" 
                  value={settings.telegram_chat_id}
                  onChange={e => setSettings({...settings, telegram_chat_id: e.target.value})}
                  className="w-full bg-black/50 border border-white/10 rounded-lg p-2 text-sm focus:outline-none focus:border-[#00ffcc] focus:ring-1 focus:ring-[#00ffcc]"
                  placeholder="-1001234567890"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button type="button" onClick={() => setShowSettings(false)} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white">Cancel</button>
                <button type="submit" className="px-4 py-2 rounded-lg text-sm bg-[#ff00ff]/20 text-[#ff00ff] border border-[#ff00ff]/50 hover:bg-[#ff00ff]/30 hover:shadow-[0_0_15px_rgba(255,0,255,0.4)] transition-all">Save Config</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Sidebar: URL List */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#110a22]/80 backdrop-blur-md border border-white/5 rounded-2xl p-4 shadow-xl">
            <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
              <Server className="w-4 h-4" /> Monitored Nodes
            </h3>
            
            <form onSubmit={handleAddUrl} className="mb-4 space-y-2">
              <input 
                type="text" 
                placeholder="Node Name" 
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-[#00ffcc]"
              />
              <div className="flex gap-2">
                <input 
                  type="url" 
                  placeholder="https://..." 
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs focus:outline-none focus:border-[#00ffcc]"
                />
                <button type="submit" className="bg-[#00ffcc]/20 text-[#00ffcc] p-2 rounded-lg border border-[#00ffcc]/30 hover:bg-[#00ffcc]/40 transition-colors">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </form>

            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 custom-scrollbar">
              {urls.map(u => (
                <div 
                  key={u.id} 
                  onClick={() => setSelectedUrl(u)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all duration-300 group ${selectedUrl?.id === u.id ? 'bg-white/10 border-[#00ffcc]/50 shadow-[0_0_20px_rgba(0,255,204,0.15)]' : 'bg-black/20 border-white/5 hover:border-white/20'}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${u.status === 'RUN' ? 'bg-[#00ffcc] shadow-[0_0_8px_#00ffcc]' : u.status === 'ERROR' ? 'bg-[#ff0055] shadow-[0_0_8px_#ff0055]' : 'bg-gray-500'}`}></div>
                      <span className="font-bold text-sm truncate max-w-[120px]">{u.name}</span>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleDeleteUrl(u.id); }} className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-[#ff0055] transition-opacity">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                  
                  {/* Battery Health Bar (Neon Green) */}
                  <div className="w-full h-1.5 bg-black/50 rounded-full overflow-hidden mt-2">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${u.uptime_percent > 95 ? 'bg-[#00ffcc] shadow-[0_0_10px_#00ffcc]' : u.uptime_percent > 80 ? 'bg-yellow-400' : 'bg-[#ff0055]'}`}
                      style={{ width: `${u.uptime_percent}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between mt-1 text-[10px] text-gray-500">
                    <span>{u.uptime_percent.toFixed(2)}%</span>
                    <span className="truncate max-w-[80px]">{u.url.replace(/^https?:\/\//, '')}</span>
                  </div>
                </div>
              ))}
              {urls.length === 0 && (
                <div className="text-center text-xs text-gray-500 py-8">No nodes monitored</div>
              )}
            </div>
          </div>
        </div>

        {/* Main Dashboard */}
        <div className="lg:col-span-3 space-y-6">
          {selectedUrl ? (
            <>
              {/* Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[#110a22]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#00ffcc]/10 rounded-full blur-2xl group-hover:bg-[#00ffcc]/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="w-5 h-5 text-[#00ffcc]" />
                    <h3 className="text-xs uppercase text-gray-400 font-bold">Current Status</h3>
                  </div>
                  <div className="text-3xl font-black tracking-tight flex items-center gap-2">
                    {selectedUrl.status === 'RUN' ? (
                      <span className="text-[#00ffcc] drop-shadow-[0_0_10px_rgba(0,255,204,0.5)]">ONLINE</span>
                    ) : selectedUrl.status === 'ERROR' ? (
                      <span className="text-[#ff0055] drop-shadow-[0_0_10px_rgba(255,0,85,0.5)]">OFFLINE</span>
                    ) : (
                      <span className="text-gray-500">UNKNOWN</span>
                    )}
                  </div>
                </div>

                <div className="bg-[#110a22]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-[#ff00ff]/10 rounded-full blur-2xl group-hover:bg-[#ff00ff]/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <Clock className="w-5 h-5 text-[#ff00ff]" />
                    <h3 className="text-xs uppercase text-gray-400 font-bold">Uptime Ratio</h3>
                  </div>
                  <div className="text-3xl font-black tracking-tight text-white">
                    {selectedUrl.uptime_percent.toFixed(2)}<span className="text-lg text-[#ff00ff]">%</span>
                  </div>
                </div>

                <div className="bg-[#110a22]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all"></div>
                  <div className="flex items-center gap-3 mb-2">
                    <Zap className="w-5 h-5 text-blue-400" />
                    <h3 className="text-xs uppercase text-gray-400 font-bold">Avg Response</h3>
                  </div>
                  <div className="text-3xl font-black tracking-tight text-white">
                    {history.length > 0 ? Math.round(history.reduce((a, b) => a + b.response_time, 0) / history.length) : 0}
                    <span className="text-lg text-blue-400 ml-1">ms</span>
                  </div>
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Area Chart: Response Time (Neon Gradient) */}
                <div className="bg-[#110a22]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold uppercase text-gray-400 mb-6 flex items-center gap-2">
                    <Activity className="w-4 h-4" /> Response Time (ms)
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <defs>
                          <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                        <YAxis stroke="#4b5563" fontSize={10} tickFormatter={(val) => `${val}ms`} axisLine={false} tickLine={false} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0a0514', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                          itemStyle={{ color: '#00ffcc' }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="responseTime" 
                          stroke="url(#colorResponse)" 
                          strokeWidth={3}
                          dot={{ r: 3, fill: '#0ea5e9', strokeWidth: 0 }}
                          activeDot={{ r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Bar Chart: Activity (Neon Multi-color) */}
                <div className="bg-[#110a22]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-xl">
                  <h3 className="text-sm font-bold uppercase text-gray-400 mb-6 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Activity Status
                  </h3>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} barSize={8}>
                        <XAxis dataKey="time" stroke="#4b5563" fontSize={10} tickMargin={10} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                          contentStyle={{ backgroundColor: '#0a0514', borderColor: '#374151', borderRadius: '8px', fontSize: '12px' }}
                        />
                        <Bar dataKey="responseTime" radius={[10, 10, 10, 10]} isAnimationActive={false}>
                          {chartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.isError ? '#ec4899' : (index % 2 === 0 ? '#8b5cf6' : '#0ea5e9')} 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Live Activity Log */}
              <div className="bg-[#110a22]/80 backdrop-blur-md border border-white/5 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-bold uppercase text-gray-400 mb-4 flex items-center gap-2">
                  <Server className="w-4 h-4" /> Live Terminal Log
                </h3>
                <div className="bg-black/50 rounded-xl p-4 font-mono text-xs h-[200px] overflow-y-auto custom-scrollbar border border-white/5">
                  {history.slice().reverse().map((h, i) => (
                    <div key={i} className="flex gap-4 mb-2 opacity-80 hover:opacity-100 transition-opacity">
                      <span className="text-gray-500">[{format(new Date(h.timestamp), 'HH:mm:ss')}]</span>
                      <span className={h.status === 'RUN' ? 'text-[#00ffcc]' : 'text-[#ff0055]'}>
                        {h.status === 'RUN' ? 'PING_OK' : 'PING_ERR'}
                      </span>
                      <span className="text-gray-300">
                        {h.response_time}ms
                      </span>
                      <span className="text-gray-600 truncate">
                        {selectedUrl.url}
                      </span>
                    </div>
                  ))}
                  {history.length === 0 && (
                    <div className="text-gray-600 italic">Waiting for ping data...</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 min-h-[500px] border border-white/5 rounded-2xl bg-[#110a22]/50 border-dashed">
              <Activity className="w-16 h-16 mb-4 opacity-20" />
              <p>Select or add a node to view analytics</p>
            </div>
          )}
        </div>
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.02);
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 255, 204, 0.5);
        }
      `}} />
    </div>
  );
}
