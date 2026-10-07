class RedisKeys:
    @staticmethod
    def session(token: str) -> str:
        return f"session:{token}"

    @staticmethod
    def global_user_profile(username: str) -> str:
        return f"global_user_profile:{username}"

    @staticmethod
    def usage(username: str, date_str: str) -> str:
        return f"usage:{username}:{date_str}"

    @staticmethod
    def sqlite_backup() -> str:
        return "sqlite_backup"

    @staticmethod
    def chat_history(username: str, session_id: str) -> str:
        return f"chat:{username}:{session_id}"

    @staticmethod
    def user_account(username: str) -> str:
        return f"user:account:{username}"

    @staticmethod
    def user_email(email: str) -> str:
        return f"user:email:{email}"

    @staticmethod
    def chat_names(username: str) -> str:
        return f"chat_names:{username}"
