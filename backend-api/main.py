from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import redis
import json
import os
import asyncio

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

r = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=6379, db=0)

# NEW: Fetch the current state of the market for new tabs
@app.get("/market_state")
async def get_market_state():
    state = r.get("last_market_state")
    if state:
        return json.loads(state)
    # Fallback if the engine hasn't processed any orders yet
    return {"type": "ORDER_BOOK", "last_price": 50, "bids": [], "asks": []}

# Fetch BOTH Wallet and Portfolio
@app.get("/user_state/{user_id}")
async def get_user_state(user_id: str):
    bal = r.hget("wallet", user_id)
    stocks = r.hget("portfolio", user_id)
    
    # Initialize new users with 100 Rupees and 0 Stocks
    if bal is None or float(bal) <= 0:
        r.hset("wallet", user_id, 100.0)
        bal = 100.0
    
    if stocks is None:
        r.hset("portfolio", user_id, 0)
        stocks = 0
        
    return {"balance": float(bal), "portfolio": int(stocks)}

# Generate initial market liquidity (10 stocks at 50)
@app.post("/seed_market")
async def seed_market(user_id:str):

    if user_id.lower() != 'akshat':
        return{"status": "Failed" , "reason": "Market can be Seeded by the HOST only"}

    order = {"user_id": "SYSTEM", "side": "SELL", "price": 50.0, "qty": 10}
    r.lpush("order_queue", json.dumps(order))
    return {"status": "Market Seeded with 10 Stocks at ₹50"}

@app.post("/place_bet")
async def place_bet(user_id: str, side: str, price: float, qty: int):
    # Get current state
    bal = float(r.hget("wallet", user_id) or 100.0)
    stocks = int(r.hget("portfolio", user_id) or 0)
    if side == "BUY":
        cost = price * qty
        if bal < cost:
            return {"status": "Failed", "reason": "Insufficient funds"}
        # Lock in the money immediately
        r.hincrbyfloat("wallet", user_id, -cost)
        
    elif side == "SELL":
        if stocks < qty:
            return {"status": "Failed", "reason": "Insufficient stocks to sell"}
        # Lock in the stocks immediately
        r.hincrby("portfolio", user_id, -qty)

    # Queue the order
    order = {"user_id": user_id, "side": side, "price": price, "qty": qty}
    r.lpush("order_queue", json.dumps(order))
    return {"status": "Order Received"}

@app.websocket("/ws/updates")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    pubsub = r.pubsub()
    pubsub.subscribe("price_updates")
    
    try:
        while True:
            message = pubsub.get_message()
            if message and message['type'] == 'message':
                data = message['data']
                if isinstance(data, bytes):
                    data = data.decode('utf-8')
                await websocket.send_text(data)
            await asyncio.sleep(0.01)
    except Exception as e:
        pass
    finally:
        pubsub.unsubscribe("price_updates")