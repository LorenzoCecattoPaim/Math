class FreeLimitReachedError(Exception):
    def __init__(self, checkout_url: str):
        self.checkout_url = checkout_url
        super().__init__("FREE_LIMIT_REACHED")
