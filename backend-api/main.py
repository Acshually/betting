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

r = redis.Redis(host=os.getenv('REDIS_HOST', 'localhost'), port=6379, db=0, decode_responses=True)

# NEW: Fetch the current state of the market for new tabs
@app.get("/market_state")
async def get_market_state():
    state = r.get("last_market_state")
    recent_trades = r.get("recent_trades")
    price_history = r.get("price_history")
    
    response = {
        "type": "ORDER_BOOK", 
        "last_price": 50, 
        "bids": [], 
        "asks": [], 
        "recent_trades": [],
        "history": []
    }
    
    if state:
        response.update(json.loads(state))
    
    if recent_trades:
        response["recent_trades"] = json.loads(recent_trades)

    if price_history:
        response["history"] = json.loads(price_history)
    else:
        # Recharts needs 2 points to draw a line
        response["history"] = [
            {"time": "Market Start", "price": 50},
            {"time": "Current", "price": 50}
        ]
        
    return response

# Fetch BOTH Wallet and Portfolio
@app.get("/user_state/{user_id}")
async def get_user_state(user_id: str):
    bal_val = r.hget("wallet", user_id)
    stocks_val = r.hget("portfolio", user_id)
    
    # Strictly check for None (doesn't exist)
    if bal_val is None:
        r.hset("wallet", user_id, 100.0)
        bal = 100.0
    else:
        bal = float(bal_val)
    
    if stocks_val is None:
        r.hset("portfolio", user_id, 0)
        stocks = 0
    else:
        stocks = int(stocks_val)
        
    return {"balance": bal, "portfolio": stocks}

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
    # Safe fetch
    bal_val = r.hget("wallet", user_id)
    bal = float(bal_val) if bal_val is not None else 100.0
    
    stocks_val = r.hget("portfolio", user_id)
    stocks = int(stocks_val) if stocks_val is not None else 0

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
        # Use a non-blocking way to listen to pubsub in an async loop
        while True:
            # Check for a message
            message = pubsub.get_message(ignore_subscribe_messages=True)
            if message:
                data = message['data']
                await websocket.send_text(data)
            # Use a much smaller sleep to keep it responsive but not CPU hungry
            await asyncio.sleep(0.001)
    except Exception as e:
        print(f"WS Error: {e}")
    finally:
        pubsub.unsubscribe("price_updates")