import redis
import json
import os
from matching_logic import OrderBook, Order

# Connect to redis using the hostname definde in docker com
r = redis.Redis(host=os.getenv('REDIS_HOST', 'redis'), port=6379, db=0, decode_responses=True)

market = OrderBook("Team_India")

print("🚀 Engine Live: Waiting for orders...")

while True:
    result = r.brpop("order_queue", timeout=0)

    if result:

        _,msg = result
        data = json.loads(msg)

        new_order = Order(data['user_id'], data['side'], data['price'], data['qty'])
        market.add_order(new_order)

        r.publish("price_updates", json.dumps({"price": data['price'], "team": "Team_India"}))
