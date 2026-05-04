import time

class Order:
    def __init__(self, user_id, side, price, quantity):
        self.user_id = user_id
        self.side = side.upper()
        self.price = float(price)
        self.quantity = int(quantity)
        self.timestamp = time.time()

class OrderBook:
    def __init__(self, team_name, redis_client):
        self.team_name = team_name
        self.redis = redis_client # NEW: Redis client reference
        self.bids = []
        self.asks = []

    def add_order(self, order):
        trades = []
        if order.side == "BUY":
            trades = self._match(order, self.asks)
            if order.quantity > 0:
                self.bids.append(order)
                self.bids.sort(key=lambda x: (-x.price, x.timestamp))
        else:
            trades = self._match(order, self.bids)
            if order.quantity > 0:
                self.asks.append(order)
                self.asks.sort(key=lambda x: (x.price, x.timestamp))
        return trades

    def _match(self, incoming, book_side):
        trades = []
        while book_side and incoming.quantity > 0:
            best_match = book_side[0]
            
            can_match = (incoming.side == "BUY" and incoming.price >= best_match.price) or \
                        (incoming.side == "SELL" and incoming.price <= best_match.price)
            
            if can_match:
                match_qty = min(incoming.quantity, best_match.quantity)
                match_price = best_match.price # Trade always executes at maker's price
                
                # Figure out who is buying and who is selling
                buyer_id = incoming.user_id if incoming.side == "BUY" else best_match.user_id
                seller_id = incoming.user_id if incoming.side == "SELL" else best_match.user_id
                
                revenue = match_qty * match_price
                
                # 1. Credit Seller's Wallet (Money)
                if seller_id != "SYSTEM":
                    self.redis.hincrbyfloat("wallet", seller_id, revenue)
                
                # 2. Credit Buyer's Portfolio (Stocks)
                if buyer_id != "SYSTEM":
                    self.redis.hincrby("portfolio", buyer_id, match_qty)
                
                print(f"💰 MATCH: {match_qty} shares at ₹{match_price}. Buyer:{buyer_id} Seller:{seller_id}")
                
                trades.append({
                    "price": match_price,
                    "qty": match_qty,
                    "time": time.time(),
                    "side": incoming.side # Use incoming side to color the trade (Aggressor)
                })

                incoming.quantity -= match_qty
                best_match.quantity -= match_qty
                
                if best_match.quantity == 0:
                    book_side.pop(0)
            else:
                break
        return trades