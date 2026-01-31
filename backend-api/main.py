from fastapi import FastAPI
import redis
import json
import os
from fastapi import WebSocket, WebSocketDisconnect
import asyncio
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
    # Using 'ignore_subscribe_messages=True' is the standard way to skip setup msgs
    pubsub.subscribe("price_updates")
    
    try:
        while True:
            # Check for messages without the failing 'ignore_subscribe_none' arg
            message = pubsub.get_message()
            if message and message['type'] == 'message':
                # Ensure data is decoded from bytes to string
                data = message['data']
                if isinstance(data, bytes):
                    data = data.decode('utf-8')
                await websocket.send_text(data)
            
            # Vital: prevents the 'Socket closed' loop by yielding control
            await asyncio.sleep(0.01) 
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket Error: {e}")
    finally:
        pubsub.unsubscribe("price_updates")