import requests
import random 
import time

# API_URL = "http://localhost:8000/place_bet"
ONLINE_TUNNEL_URL = "https://viewed-spy-red-earning.trycloudflare.com/" 
API_URL = f"{ONLINE_TUNNEL_URL}/place_bet"


USERS = ["Akash","User_77","Trader_X","Bot_101"]

def send_bet():
    user = random.choice(USERS)
    side = random.choice(["BUY","SELL"])

    price = random.randint(98,102)
    qty = random.randint(1,5)

    payload = {
        "user_id": user,
        "side": side,
        "price": price,
        "qty": qty
    }

    try:
        response = requests.post(API_URL, params=payload)

        if response.status_code == 200:
            print(f"🚀 {user} sent {side} for {qty} shares @ ₹{price}")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    print("Starting Trade Simulation... (Ctrl+C to stop)")
    for _ in range(25):  # Send 25 orders
        send_bet()
        time.sleep(0.2) # 200ms delay between orders


# cloudflared tunnel --url http://localhost:5173
# docker compose up -d