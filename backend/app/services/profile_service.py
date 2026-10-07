import json
from datetime import date
from typing import Optional
from fastapi import HTTPException

from backend.app.schemas.profile_schemas import UserProfileExtraction
from backend.app.repositories.profile_repository import ProfileRepository
from backend.app.core.security import redis_client
from backend.app.core.base_service import BaseService
from backend.app.core.redis_keys import RedisKeys


class ProfileService(BaseService):
    def __init__(self, profile_repo: Optional[ProfileRepository] = None):
        super().__init__("crickait-backend")
        self.profile_repo = profile_repo or ProfileRepository()

    async def get_limits(self, username: str, local_date: Optional[str] = None) -> dict:
        if username.startswith('guest_'):
            plan = 'guest'
        else:
            plan = await self.profile_repo.get_user_plan(username)

        limit = 20 if plan == 'guest' else (100 if plan == 'free' else None)
        today = local_date if local_date else date.today().isoformat()

        if limit is not None:
            usage_val = await redis_client.get(RedisKeys.usage(username, today))
            usage = int(usage_val) if usage_val else 0
            remaining = max(0, limit - usage)
        else:
            usage = 0
            remaining = 999999

        return {
            "plan": plan,
            "usage": usage,
            "limit": limit,
            "remaining": remaining
        }

    async def get_profile(self, username: str) -> dict:
        try:
            global_data_str = await redis_client.get(RedisKeys.global_user_profile(username))
            return json.loads(global_data_str) if global_data_str else {}
        except Exception as e:
            self.handle_error("Get profile", e, detail="Failed to fetch profile")

    async def save_profile(self, profile_data: UserProfileExtraction, username: str) -> dict:
        try:
            data = profile_data.model_dump(exclude_none=True)
            await redis_client.set(RedisKeys.global_user_profile(username), json.dumps(data))
            return {"status": "success", "profile": data}
        except Exception as e:
            self.handle_error("Save profile", e, detail="Failed to save profile")

    async def clear_profile(self, username: str) -> dict:
        try:
            await redis_client.delete(RedisKeys.global_user_profile(username))
            return {"status": "cleared"}
        except Exception as e:
            self.handle_error("Clear profile", e, detail="Failed to clear profile")

    async def remove_profile_item(self, category: str, item: str, username: str) -> dict:
        self.validate_condition(
            category in ["favorite_players", "favorite_teams"],
            detail="Invalid category"
        )

        try:
            redis_key = RedisKeys.global_user_profile(username)
            global_data_str = await redis_client.get(redis_key)
            if not global_data_str:
                return {"status": "empty"}

            profile = json.loads(global_data_str)

            if category in profile and item in profile[category]:
                profile[category].remove(item)
                if not profile[category]:
                    del profile[category]
                await redis_client.set(redis_key, json.dumps(profile))
            return {"status": "success"}
        except Exception as e:
            self.handle_error("Remove profile item", e, detail="Failed to remove profile item")
