import redis
import json
import os
from matching_logic import OrderBook, Order

r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), port=6379, db=0, decode_responses=True)

# NEW: Pass Redis client into the OrderBook
market = OrderBook("Team_India", r)

print("🚀 Engine Live: Waiting for orders...")

while True:
    result = r.brpop("order_queue", timeout=0)
    if result:
        _, msg = result
        data = json.loads(msg)

        new_order = Order(data['user_id'], data['side'], data['price'], data['qty'])
        market.add_order(new_order)

        payload = {
            "type": "ORDER_BOOK",
            "last_price": data['price'],
            "bids": [{"price": b.price, "qty": b.quantity} for b in market.bids[:10]],
            "asks": [{"price": a.price, "qty": a.quantity} for a in market.asks[:10]]
        }
        
        payload_str = json.dumps(payload)
        
        # NEW: Save the last known state so new tabs can fetch it immediately
        r.set("last_market_state", payload_str) 
        
        # Publish to active websockets
        r.publish("price_updates", payload_str)