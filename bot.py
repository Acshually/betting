import requests
import random 
import time

import requests
import random 
import time

# Use localhost since you are running this as a separate script while Docker is up
API_URL = "http://localhost:8000/place_bet"

USERS = ["Akash","User_77","Trader_X","Bot_101", "Pro_Trader", "Alpha_One"]    

def send_bet():
    user = random.choice(USERS)
    side = random.choice(["BUY","SELL"])

    # Make prices slightly more dynamic around 50 (the seed price)
    # This ensures the graph looks like a real market
    base_price = 50
    price = base_price + random.randint(-5, 5)
    qty = random.randint(1, 10)

    payload = {
        "user_id": user,
        "side": side,
        "price": float(price),
        "qty": int(qty)
    }

    try:
        # We use 'params' because your FastAPI endpoint uses Query parameters
        response = requests.post(API_URL, params=payload)

        if response.status_code == 200:
            color = "\033[92m" if side == "BUY" else "\033[91m"
            reset = "\033[0m"
            print(f"🚀 {user} sent {color}{side}{reset} for {qty} shares @ ₹{price}")
        else:
            print(f"⚠️ {user} order failed: {response.json().get('reason', 'Unknown error')}")
    except Exception as e:
        print(f"❌ Connection Error: Ensure Docker is running! ({e})")

if __name__ == "__main__":
    print("--- 🤖 SportsXchange Market Simulator Starting ---")
    print(f"Targeting: {API_URL}")
    print("Press Ctrl+C to stop simulation\n")
    
    try:
        while True:
            send_bet()
            # Random delay between 0.1 and 0.8 seconds to simulate real human traffic
            time.sleep(random.uniform(0.1, 0.8))
    except KeyboardInterrupt:
        print("\n🛑 Simulation Stopped.")


# cloudflared tunnel --url http://localhost:5173
# docker compose up -d