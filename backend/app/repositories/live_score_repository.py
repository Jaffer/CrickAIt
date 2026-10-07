from backend.app.core.database import DatabaseProvider

class LiveScoreRepository:
    def __init__(self, db_provider: DatabaseProvider = None):
        self.db_provider = db_provider or DatabaseProvider()
        # Live scores currently do not have SQLite persistence.
        # This repository is created for architectural consistency and future use.
        pass
