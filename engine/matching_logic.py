import time

class Order:
    def __init__(self, user_id, side, price, quantity):
        self.user_id = user_id
        self.side = side.upper()  # "BUY" or "SELL"
        self.price = float(price)
        self.quantity = int(quantity)
        self.timestamp = time.time()

class OrderBook:
    def __init__(self, team_name):
        self.team_name = team_name
        self.bids = []  # Buyers: Sorted by Price (High to Low), then Time
        self.asks = []  # Sellers: Sorted by Price (Low to High), then Time

    def add_order(self, order):
        # 1. Try to match with existing orders
        if order.side == "BUY":
            self._match(order, self.asks)
            if order.quantity > 0:
                self.bids.append(order)
                # Sort: Best Price (Highest) first. If same, oldest first.
                self.bids.sort(key=lambda x: (-x.price, x.timestamp))
        else:
            self._match(order, self.bids)
            if order.quantity > 0:
                self.asks.append(order)
                # Sort: Best Price (Lowest) first. If same, oldest first.
                self.asks.sort(key=lambda x: (x.price, x.timestamp))

    def _match(self, incoming, book_side):
        while book_side and incoming.quantity > 0:
            best_match = book_side[0]
            
            # Check if prices "cross"
            can_match = (incoming.side == "BUY" and incoming.price >= best_match.price) or \
                        (incoming.side == "SELL" and incoming.price <= best_match.price)
            
            if can_match:
                match_qty = min(incoming.quantity, best_match.quantity)
                print(f"💰 MATCH: {match_qty} shares at ₹{best_match.price} for {self.team_name}")
                
                incoming.quantity -= match_qty
                best_match.quantity -= match_qty
                
                if best_match.quantity == 0:
                    book_side.pop(0) # Remove filled order
            else:
                break
