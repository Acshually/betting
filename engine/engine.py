import redis
import json
import os
import time
from matching_logic import OrderBook, Order

r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), port=6379, db=0, decode_responses=True)

# NEW: Pass Redis client into the OrderBook
market = OrderBook("Team_India", r)

print("🚀 Engine Live: Waiting for orders...")

while True:
    result = r.brpop("order_queue", timeout=1)
    if result:
        _, msg = result
        data = json.loads(msg)

        new_order = Order(data['user_id'], data['side'], data['price'], data['qty'])
        trades = market.add_order(new_order)

        # Get recent trades from redis or initialize
        recent_trades_raw = r.get("recent_trades")
        recent_trades = json.loads(recent_trades_raw) if recent_trades_raw else []
        
        # Add new trades and keep only last 20
        recent_trades = (trades + recent_trades)[:20]
        r.set("recent_trades", json.dumps(recent_trades))

        # NEW: Maintain Price History for the Chart
        new_price = trades[0]['price'] if trades else data['price']
        history_raw = r.get("price_history")
        price_history = json.loads(history_raw) if history_raw else []
        
        # Add new price point with timestamp
        price_history.append({"time": time.strftime("%H:%M:%S"), "price": new_price})
        # Keep last 50 points
        price_history = price_history[-50:]
        r.set("price_history", json.dumps(price_history))

        payload = {
            "type": "ORDER_BOOK",
            "last_price": new_price,
            "bids": [{"price": b.price, "qty": b.quantity} for b in market.bids[:10]],
            "asks": [{"price": a.price, "qty": a.quantity} for a in market.asks[:10]],
            "recent_trades": recent_trades,
            "history": price_history
        }
        
        payload_str = json.dumps(payload)
        
        # NEW: Save the last known state so new tabs can fetch it immediately
        r.set("last_market_state", payload_str) 
        
        # Publish to active websockets
        r.publish("price_updates", payload_str)
    
    time.sleep(0.01) # prevent cpu spike
