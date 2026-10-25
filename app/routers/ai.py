from fastapi import APIRouter, HTTPException
from app.schemas.schemas import AIRequest
from app.services import ai_service

router = APIRouter(prefix="/ai", tags=["AI"])

@router.post("/suggest")
async def suggest_design(payload: AIRequest):
    prompt_text = payload.prompt or payload.team_name or ""
    result, error = await ai_service.get_jersey_suggestion(
        prompt_text,
        payload.current_design,
        payload.history
    )
    if error:
        raise HTTPException(status_code=500, detail=error)
    return result