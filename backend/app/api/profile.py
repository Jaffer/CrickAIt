from fastapi import APIRouter, Depends
from typing import Optional

from backend.app.schemas.profile_schemas import UserProfileExtraction
from backend.app.services.profile_service import ProfileService
from backend.app.core.security import get_current_user

router = APIRouter()
profile_service = ProfileService()

@router.get("/limits")
async def get_limits(local_date: Optional[str] = None, username: str = Depends(get_current_user)):
    return await profile_service.get_limits(username, local_date)

@router.get("/profile")
async def get_profile(username: str = Depends(get_current_user)):
    return await profile_service.get_profile(username)

@router.post("/profile")
async def save_profile(profile_data: UserProfileExtraction, username: str = Depends(get_current_user)):
    return await profile_service.save_profile(profile_data, username)

@router.delete("/profile/clear")
async def clear_profile(username: str = Depends(get_current_user)):
    return await profile_service.clear_profile(username)

@router.delete("/profile/item")
async def remove_profile_item(category: str, item: str, username: str = Depends(get_current_user)):
    return await profile_service.remove_profile_item(category, item, username)
