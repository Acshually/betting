import React, { useState, useEffect, useRef } from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUp, ArrowDown, Zap, History } from 'lucide-react';

const App = () => {
  const [price, setPrice] = useState(0);
  const [history, setHistory] = useState([]);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [order, setOrder] = useState({ user_id: 'Akash', side: 'BUY', price: 100, qty: 1 });
  const [status, setStatus] = useState('connecting');

useEffect(() => {
  let socket;
  let connectInterval;

  const connect = () => {
    // This line is the magic fix:
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    // This automatically uses the tunnel URL or localhost depending on where you are
    socket = new WebSocket(`${protocol}//${window.location.host}/ws/updates`);

    socket.onopen = () => {
      console.log("Connected to WebSocket");
      setStatus('live');
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "ORDER_BOOK") {
          setOrderBook({ bids: data.bids || [], asks: data.asks || [] });
          setPrice(data.last_price || 0);
          setHistory(prev => [...prev, { 
            time: new Date().toLocaleTimeString().slice(0, 8), 
            price: data.last_price 
          }].slice(-30));
        }
      } catch (err) {
        console.error("Data error:", err);
      }
    };

    socket.onclose = () => {
      setStatus('disconnected');
      connectInterval = setTimeout(connect, 3000);
    };
  };

  connect();
  return () => { socket?.close(); clearTimeout(connectInterval); };
}, []);

const placeOrder = async () => {
  try {
    const params = new URLSearchParams(order);
    // Use the relative path /place_bet so Vite proxies it to the backend-api service
    await fetch(`/place_bet?${params.toString()}`, { method: 'POST' });
  } catch (err) {
    console.error("Trade failed", err);
  }
};

  return (
    <div className="min-h-screen bg-[#0b0e11] text-[#eaecef] p-4 font-sans lg:overflow-hidden">
      {/* Navbar */}
      <nav className="flex items-center justify-between mb-4 bg-[#161a1e] p-4 rounded-lg border border-gray-800">
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-yellow-400 flex items-center gap-2">
            <Zap fill="currentColor" /> PRO-TRADE
          </h1>
          <div className="hidden md:flex gap-4 text-sm border-l border-gray-700 pl-6">
            <div>
              <span className="text-gray-500">Pair:</span> <span className="font-mono">IND/INR</span>
            </div>
            <div>
              <span className="text-gray-500">24h Change:</span> <span className="text-green-400">+5.2%</span>
            </div>
          </div>
        </div>
        <div className={`text-xs px-3 py-1 rounded-full ${status === 'live' ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
          ● {status.toUpperCase()}
        </div>
      </nav>

      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-120px)]">
        
        {/* Market Chart */}
        <div className="col-span-12 lg:col-span-6 xl:col-span-7 bg-[#161a1e] rounded-lg p-4 border border-gray-800">
          <div className="mb-4">
            <span className="text-gray-400 text-sm italic">Price Action</span>
            <h2 className="text-3xl font-mono font-bold text-white">₹{price.toLocaleString()}</h2>
          </div>
          <div className="w-full mt-4" style={{ height: '400px', minHeight: '400px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2b3139" vertical={false} />
                <XAxis dataKey="time" stroke="#474d57" fontSize={10} tickMargin={10} />
                <YAxis domain={['auto', 'auto']} orientation="right" stroke="#474d57" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1e2329', border: 'none', borderRadius: '4px' }} />
                <Area type="monotone" dataKey="price" stroke="#10B981" fillOpacity={1} fill="url(#colorPrice)" isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Book */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 bg-[#161a1e] rounded-lg flex flex-col border border-gray-800 overflow-hidden">
          <div className="p-3 border-b border-gray-800 font-semibold text-sm">Order Book</div>
          <div className="flex-1 overflow-y-auto font-mono text-xs">
            {/* Asks (Sellers) */}
            <div className="flex flex-col-reverse">
              {orderBook.asks.map((ask, i) => (
                <div key={i} className="relative flex justify-between px-3 py-1 hover:bg-red-900/10">
                   <div className="absolute right-0 top-0 bottom-0 bg-red-500/10 transition-all duration-300" style={{ width: `${(ask.qty / 100) * 100}%` }} />
                   <span className="text-red-400 relative">{ask.price}</span>
                   <span className="relative">{ask.qty}</span>
                </div>
              ))}
            </div>
            
            {/* Current Spread */}
            <div className="bg-[#2b3139] py-2 px-3 my-1 flex justify-between items-center">
              <span className="text-lg font-bold text-white italic">₹{price}</span>
              <span className="text-[10px] text-gray-500">Spread: 0.05</span>
            </div>

            {/* Bids (Buyers) */}
            <div className="flex flex-col">
              {orderBook.bids.map((bid, i) => (
                <div key={i} className="relative flex justify-between px-3 py-1 hover:bg-green-900/10">
                   <div className="absolute right-0 top-0 bottom-0 bg-green-500/10 transition-all duration-300" style={{ width: `${(bid.qty / 100) * 100}%` }} />
                   <span className="text-green-400 relative">{bid.price}</span>
                   <span className="relative">{bid.qty}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Trade Terminal */}
        <div className="col-span-12 md:col-span-6 lg:col-span-3 xl:col-span-2 bg-[#161a1e] rounded-lg p-4 border border-gray-800">
          <div className="flex bg-[#2b3139] rounded p-1 mb-6">
            <button onClick={() => setOrder({...order, side: 'BUY'})} className={`flex-1 py-1.5 rounded text-sm font-bold transition ${order.side === 'BUY' ? 'bg-[#0ecb81] text-black' : 'text-gray-400'}`}>BUY</button>
            <button onClick={() => setOrder({...order, side: 'SELL'})} className={`flex-1 py-1.5 rounded text-sm font-bold transition ${order.side === 'SELL' ? 'bg-[#f6465d] text-white' : 'text-gray-400'}`}>SELL</button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Price (INR)</label>
              <input type="number" className="w-full bg-[#2b3139] border border-transparent focus:border-yellow-500 rounded p-2 text-white outline-none mt-1" value={order.price} onChange={e => setOrder({...order, price: e.target.value})} />
            </div>
            <div>
              <label className="text-[10px] text-gray-500 uppercase font-bold">Quantity</label>
              <input type="number" className="w-full bg-[#2b3139] border border-transparent focus:border-yellow-500 rounded p-2 text-white outline-none mt-1" value={order.qty} onChange={e => setOrder({...order, qty: e.target.value})} />
            </div>

            <div className="pt-4 border-t border-gray-800">
              <div className="flex justify-between text-xs mb-2">
                <span className="text-gray-500">Total:</span>
                <span className="font-bold text-white">₹{(order.price * order.qty).toLocaleString()}</span>
              </div>
              <button onClick={placeOrder} className={`w-full py-3 rounded font-bold transition-transform active:scale-95 ${order.side === 'BUY' ? 'bg-[#0ecb81] hover:bg-[#0bb371] text-black' : 'bg-[#f6465d] hover:bg-[#d43d50] text-white'}`}>
                {order.side} IND
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;