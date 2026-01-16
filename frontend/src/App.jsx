import React, { useState, useEffect } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { TrendingUp, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

function App() {
  const [price, setPrice] = useState(100);
  const [history, setHistory] = useState([]); // Stores data for the graph
  const [order, setOrder] = useState({ user_id: 'Akash', side: 'BUY', price: 100, qty: 1 });

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws/updates');
    
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      const newPrice = parseFloat(data.price);
      
      setPrice(newPrice);
      
      // Update Graph History (keep last 20 points)
      setHistory(prev => {
        const newHistory = [...prev, { time: new Date().toLocaleTimeString(), price: newPrice }];
        if (newHistory.length > 20) return newHistory.slice(1);
        return newHistory;
      });
    };

    return () => socket.close();
  }, []);

  const placeBet = async () => {
    try {
      // Note: Using URLSearchParams is cleaner than manual string interpolation
      const params = new URLSearchParams(order);
      await fetch(`http://localhost:8000/place_bet?${params.toString()}`, { method: 'POST' });
      alert("Order Placed successfully!");
    } catch (err) {
      console.error("Order failed", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8 font-sans">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 border-b border-gray-700 pb-4">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <TrendingUp className="text-green-400" /> 🏏 Pro Exchange
        </h1>
        <div className="text-right">
          <p className="text-gray-400 text-sm">Market Status</p>
          <p className="text-green-400 font-mono">● LIVE</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Stats & Graph */}
        <div className="lg:col-span-2 bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-gray-400 uppercase text-xs tracking-widest">Last Traded Price</h2>
              <p className="text-5xl font-mono font-bold text-green-400">₹{price.toFixed(2)}</p>
            </div>
          </div>

          {/* Real-time Graph */}
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" stroke="#9CA3AF" fontSize={10} />
                <YAxis domain={['auto', 'auto']} stroke="#9CA3AF" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  itemStyle={{ color: '#10B981' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="price" 
                  stroke="#10B981" 
                  strokeWidth={3} 
                  dot={false} 
                  isAnimationActive={false} // Faster updates
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right Column: Trading Terminal */}
        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-xl">
          <h3 className="text-xl font-bold mb-4">Trade Console</h3>
          
          <div className="flex gap-2 mb-6">
            <button 
              onClick={() => setOrder({...order, side: 'BUY'})}
              className={`flex-1 py-2 rounded font-bold transition ${order.side === 'BUY' ? 'bg-green-600' : 'bg-gray-700 text-gray-400'}`}
            >
              BUY
            </button>
            <button 
              onClick={() => setOrder({...order, side: 'SELL'})}
              className={`flex-1 py-2 rounded font-bold transition ${order.side === 'SELL' ? 'bg-red-600' : 'bg-gray-700 text-gray-400'}`}
            >
              SELL
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Limit Price (₹)</label>
              <input 
                type="number" 
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:outline-none focus:border-blue-500"
                value={order.price} 
                onChange={e => setOrder({...order, price: e.target.value})} 
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Quantity</label>
              <input 
                type="number" 
                className="w-full bg-gray-900 border border-gray-600 rounded p-3 focus:outline-none focus:border-blue-500"
                value={order.qty} 
                onChange={e => setOrder({...order, qty: e.target.value})} 
              />
            </div>

            <button 
              onClick={placeBet}
              className={`w-full py-4 rounded-lg font-bold text-lg mt-4 shadow-lg active:scale-95 transition-all
                ${order.side === 'BUY' ? 'bg-green-500 hover:bg-green-400' : 'bg-red-500 hover:bg-red-400'}`}
            >
              Place {order.side} Order
            </button>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Est. Total:</span>
              <span className="font-bold">₹{(order.price * order.qty).toLocaleString()}</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

export default App;