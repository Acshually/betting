import React, { useState, useEffect } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Zap, Wallet, UserCircle, Briefcase, PlusCircle } from 'lucide-react';

// Use Vite proxy for reliability in Docker and Local
const HOST = window.location.host; // includes port
const API_URL = "/api";
const WS_URL = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${HOST}/ws/updates`;

const App = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [usernameInput, setUsernameInput] = useState("");

  const [price, setPrice] = useState(0);
  const [prevPrice, setPrevPrice] = useState(0);
  const [history, setHistory] = useState([]);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  
  const [order, setOrder] = useState({ user_id: '', side: 'BUY', price: 50, qty: 1 });
  const [balance, setBalance] = useState(0);
  const [portfolio, setPortfolio] = useState(0);
  const [status, setStatus] = useState('connecting');

  // Use dynamic API_URL
  const fetchUserState = async (user) => {
    try {
      const res = await fetch(`${API_URL}/user_state/${user}`);
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance || 0);
        setPortfolio(data.portfolio || 0);
      }
    } catch (err) {
      console.error("Failed to fetch state");
    }
  };

  // NEW: Fetch the current order book when a new tab opens
  const fetchMarketState = async () => {
    try {
      const res = await fetch(`${API_URL}/market_state`);
      if (res.ok) {
        const data = await res.json();
        setOrderBook({ bids: data.bids || [], asks: data.asks || [] });
        setPrice(data.last_price || 0);
        setPrevPrice(data.last_price || 0);
        setRecentTrades(data.recent_trades || []);
        setHistory(data.history || []);
      }
    } catch (err) {
      console.error("Failed to fetch market state");
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (usernameInput.trim() === "") return;
    const newUser = usernameInput.trim();
    setOrder(prev => ({ ...prev, user_id: newUser }));
    fetchUserState(newUser);
    setIsLoggedIn(true);
  };

  useEffect(() => {
    if (!isLoggedIn) return;
    
    // NEW: Load the initial market data immediately
    fetchMarketState();

    // Use dynamic WS_URL
    const socket = new WebSocket(`${WS_URL}`);
    
    socket.onopen = () => setStatus('live');
    socket.onclose = () => setStatus('disconnected');

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "ORDER_BOOK") {
        setOrderBook({ bids: data.bids || [], asks: data.asks || [] });
        setPrice(current => {
          setPrevPrice(current);
          return data.last_price || 0;
        });
        setRecentTrades(data.recent_trades || []);
        if (data.history) {
          setHistory(data.history);
        }
      }
    };

    // Periodically refresh user state (every 3 seconds) instead of every market update
    const stateInterval = setInterval(() => fetchUserState(order.user_id), 3000);

    return () => {
        socket.close();
        clearInterval(stateInterval);
    };
  }, [isLoggedIn, order.user_id]);

  const placeOrder = async () => {
    if (order.side === 'BUY' && (order.price * order.qty) > balance) {
      alert(`Insufficient Funds! You need ₹${order.price * order.qty}`);
      return;
    }
    if (order.side === 'SELL' && order.qty > portfolio) {
      alert(`Insufficient Stocks! You only own ${portfolio} stocks.`);
      return;
    }

    try {
      const params = new URLSearchParams(order);
      await fetch(`${API_URL}/place_bet?${params.toString()}`, { method: 'POST' });
      fetchUserState(order.user_id); 
    } catch (err) {
      console.error("Trade failed", err);
    }
  };

  const seedMarket = async () => {
    
    try{
      const res = await fetch(`${API_URL}/seed_market?user_id=${order.user_id}`, { method: 'POST' });
      const data = res.json();
      // alert("Market Seeded: 10 Stocks at ₹50 added to Order Book!");

      if(data.status === "Failed"){
        alert(data.reason);
      } else {
        alert(data.status)
      }
    } catch(err){
      console.error("Failed to seed market ", err);
      
    }
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#0b0e11] flex flex-col items-center justify-center text-white">
        <div className="bg-[#161a1e] p-8 rounded-xl border border-gray-800 w-96 text-center">
          <Zap size={48} className="text-yellow-400 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">SportsXchange</h1>
          <p className="text-gray-400 text-sm mb-8">Enter username to claim ₹100</p>
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <input type="text" placeholder="Username" className="w-full bg-[#2b3139] border border-gray-700 rounded p-3 text-white" value={usernameInput} onChange={e => setUsernameInput(e.target.value)} />
            <button type="submit" className="bg-[#0ecb81] text-black font-bold py-3 rounded">Enter Market</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] p-4 font-sans lg:overflow-hidden">
      <nav className="flex items-center justify-between mb-4 bg-[#161a1e] p-4 rounded-lg border border-gray-800">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-yellow-400 flex items-center gap-2"><Zap /> SportsXchange</h1>
          <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-bold uppercase ${status === 'live' ? 'bg-green-900/40 text-green-400 border border-green-800' : 'bg-red-900/40 text-red-400 border border-red-800'}`}>
            <div className={`w-1.5 h-1.5 rounded-full ${status === 'live' ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            {status}
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Host Admin Button */}
          <button onClick={seedMarket} className="flex items-center gap-1 text-xs bg-purple-900/40 text-purple-400 px-3 py-2 rounded border border-purple-800 hover:bg-purple-800/40 transition">
            <PlusCircle size={14}/> Seed 10 Stocks
          </button>
          
          {/* Portfolio & Wallet Stats */}
          <div className="flex items-center gap-3 bg-[#2b3139] px-4 py-2 rounded-lg font-mono text-sm border border-gray-700">
            <UserCircle size={16} className="text-gray-400" />
            <span className="text-gray-300 font-bold">{order.user_id}</span>
            
            <div className="border-l border-gray-600 pl-3 flex items-center gap-1">
              <Briefcase size={16} className="text-blue-400" />
              <span className="text-white font-bold">{portfolio} IND</span>
            </div>

            <div className="border-l border-gray-600 pl-3 flex items-center gap-1">
              <Wallet size={16} className="text-green-400" />
              <span className="text-white font-bold">₹{Number(balance).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Grid Layout stays exactly the same as before... */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        
        {/* Chart */}
        <div className="col-span-12 lg:col-span-6 xl:col-span-7 bg-[#161a1e] rounded-lg p-4 border border-gray-800">
          <div className="flex items-end gap-3 mb-4">
            <h2 className={`text-3xl font-mono font-bold ${price >= prevPrice ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              ₹{price.toLocaleString()}
            </h2>
            <span className={`text-sm font-bold mb-1 ${price >= prevPrice ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              {price >= prevPrice ? '▲' : '▼'} 
              {prevPrice !== 0 ? (((price - prevPrice) / prevPrice) * 100).toFixed(2) : '0.00'}%
            </span>
          </div>
          <div className="w-full mt-4" style={{ height: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" vertical={false} />
                <XAxis dataKey="time" stroke="#474d57" fontSize={10} />
                <YAxis domain={['auto', 'auto']} orientation="right" stroke="#474d57" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1e2329', border: 'none' }} />
                <Area type="monotone" dataKey="price" stroke={price >= prevPrice ? "#10B981" : "#f6465d"} fill={price >= prevPrice ? "#10B981" : "#f6465d"} fillOpacity={0.1} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Book */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#161a1e] rounded-lg flex flex-col border border-gray-800 overflow-hidden">
          <div className="p-3 border-b border-gray-800 font-semibold text-sm flex justify-between">
            <span>Order Book</span>
            <span className="text-[10px] text-gray-500">Price / Qty</span>
          </div>
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            <div className="flex flex-col-reverse">
              {orderBook.asks.map((ask, i) => {
                const maxQty = Math.max(...orderBook.asks.map(a => a.qty), 1);
                return (
                  <div key={i} className="relative flex justify-between px-3 py-1 text-red-400 hover:bg-red-900/10">
                    <div className="absolute right-0 top-0 bottom-0 bg-red-900/20" style={{ width: `${(ask.qty / maxQty) * 100}%` }}></div>
                    <span className="relative">{ask.price}</span><span className="relative">{ask.qty}</span>
                  </div>
                );
              })}
            </div>
            <div className={`bg-[#2b3139] py-2 px-3 my-1 flex justify-between items-center text-lg font-bold italic transition-colors duration-300 ${price >= prevPrice ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
              ₹{price} {price >= prevPrice ? '▲' : '▼'}
            </div>
            <div className="flex flex-col">
              {orderBook.bids.map((bid, i) => {
                const maxQty = Math.max(...orderBook.bids.map(b => b.qty), 1);
                return (
                  <div key={i} className="relative flex justify-between px-3 py-1 text-green-400 hover:bg-green-900/10">
                    <div className="absolute right-0 top-0 bottom-0 bg-green-900/20" style={{ width: `${(bid.qty / maxQty) * 100}%` }}></div>
                    <span className="relative">{bid.price}</span><span className="relative">{bid.qty}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Terminal & Recent Trades */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 xl:col-span-2 flex flex-col gap-4">
          
          {/* Trade Terminal */}
          <div className="bg-[#161a1e] rounded-lg p-4 border border-gray-800">
            <div className="flex bg-[#2b3139] rounded p-1 mb-6">
              <button onClick={() => setOrder({...order, side: 'BUY'})} className={`flex-1 py-1.5 rounded text-sm font-bold ${order.side === 'BUY' ? 'bg-[#0ecb81] text-black' : 'text-gray-400'}`}>BUY</button>
              <button onClick={() => setOrder({...order, side: 'SELL'})} className={`flex-1 py-1.5 rounded text-sm font-bold ${order.side === 'SELL' ? 'bg-[#f6465d] text-white' : 'text-gray-400'}`}>SELL</button>
            </div>
            <div className="space-y-4">
              <div><label className="text-[10px] text-gray-500 uppercase font-bold">Price</label><input type="number" className="w-full bg-[#2b3139] rounded p-2 text-white outline-none" value={order.price} onChange={e => setOrder({...order, price: e.target.value})} /></div>
              <div><label className="text-[10px] text-gray-500 uppercase font-bold">Quantity</label><input type="number" className="w-full bg-[#2b3139] rounded p-2 text-white outline-none" value={order.qty} onChange={e => setOrder({...order, qty: e.target.value})} /></div>
              <div className="pt-4 border-t border-gray-800">
                <button onClick={placeOrder} className={`w-full py-3 rounded font-bold ${order.side === 'BUY' ? 'bg-[#0ecb81] text-black' : 'bg-[#f6465d] text-white'}`}>{order.side} IND</button>
              </div>
            </div>
          </div>

          {/* Recent Trades */}
          <div className="flex-1 bg-[#161a1e] rounded-lg border border-gray-800 overflow-hidden flex flex-col">
            <div className="p-3 border-b border-gray-800 font-semibold text-sm">Recent Trades</div>
            <div className="flex-1 overflow-y-auto font-mono text-[10px]">
              <div className="flex justify-between px-3 py-1 text-gray-500 border-b border-gray-800/50">
                <span>Price</span><span>Qty</span><span>Time</span>
              </div>
              {recentTrades.map((trade, i) => (
                <div key={i} className="flex justify-between px-3 py-1 hover:bg-gray-800/50">
                  <span className={trade.side === 'BUY' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}>{trade.price}</span>
                  <span className="text-gray-300">{trade.qty}</span>
                  <span className="text-gray-500">{new Date(trade.time * 1000).toLocaleTimeString().slice(0, 8)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
export default App;