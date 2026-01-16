from fastapi import FastAPI
import redis
import json
import os
from fastapi import WebSocket
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Add this block right after 'app = FastAPI()'
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In production, you'd put your specific domain here
    allow_methods=["*"],
    allow_headers=["*"],
)


r = redis.Redis(host=os.getenv('REDIS_HOST','localhost'),port=6379,db=0)

@app.post("/place_bet")
async def place_bet(user_id: str, side: str, price: float, qty: int):
    order = {
            "user_id": user_id,
            "side": side,
            "price": price,
            "qty": qty
            }
    # Push order to redos Queue
    r.lpush("order_queue",json.dumps(order))
    return {"status": "Order Received", "order": order}

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pubsub = r.pubsub()
    pubsub.subscribe("price_updates")

    for message in pubsub.listen():
        if message['type'] == 'message':
            await websocket.send_text(message['data'])
