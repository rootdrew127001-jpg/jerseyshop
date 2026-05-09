from fastapi import APIRouter, HTTPException
from app.schemas.schemas import AIRequest
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/suggest")
async def suggest_design(payload: AIRequest):
    result, error = await ai_service.get_jersey_suggestion(payload.team_name)
    if error:
        raise HTTPException(status_code=500, detail=error)
    return result