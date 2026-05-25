"""Tests for the /generate-outfit endpoint and underlying LangGraph agent."""
import os
import pytest
from unittest.mock import patch


@pytest.mark.asyncio
async def test_returns_503_when_llm_api_key_is_unset(client, sample_wardrobe, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "")
    monkeypatch.setenv("OPENAI_API_KEY", "")

    # Reimport main with empty keys so LLM_API_KEY is "" at module load
    import importlib
    import main as main_module
    importlib.reload(main_module)
    from httpx import ASGITransport, AsyncClient
    transport = ASGITransport(app=main_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        res = await ac.post(
            "/generate-outfit",
            json={"user_id": "u1", "wardrobe_items": sample_wardrobe},
        )

    assert res.status_code == 503
    assert "not configured" in res.json()["detail"].lower()


@pytest.mark.asyncio
async def test_returns_structured_outfit_when_agent_succeeds(client, sample_wardrobe, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-fake-for-tests")

    import importlib
    import main as main_module
    importlib.reload(main_module)

    fake_result = {
        "user_id": "u1",
        "wardrobe_items": sample_wardrobe,
        "preferences": {"surprise_me": True},
        "locked_item_ids": [],
        "categorized": {"tops": [sample_wardrobe[0]], "bottoms": [sample_wardrobe[1]], "shoes": [sample_wardrobe[2]]},
        "selected_outfit": {
            "selected_item_ids": ["i1", "i2", "i3"],
            "outfit_name": "Crisp Classic",
            "score": 92,
            "reasoning": "Clean palette and balanced formality.",
            "occasion": "casual",
            "color_scheme": ["#ffffff", "#1e3a8a"],
            "weather_score": 8,
            "style_score": 9,
        },
        "errors": [],
    }

    with patch.object(main_module.agent, "invoke", return_value=fake_result):
        from httpx import ASGITransport, AsyncClient
        transport = ASGITransport(app=main_module.app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post(
                "/generate-outfit",
                json={"user_id": "u1", "wardrobe_items": sample_wardrobe},
            )

    assert res.status_code == 200
    body = res.json()
    assert body["outfit_name"] == "Crisp Classic"
    assert body["score"] == 92
    assert body["selected_item_ids"] == ["i1", "i2", "i3"]
    assert body["occasion"] == "casual"


@pytest.mark.asyncio
async def test_returns_422_when_validation_fails_and_no_outfit(client, monkeypatch):
    monkeypatch.setenv("LLM_API_KEY", "sk-fake-for-tests")

    import importlib
    import main as main_module
    importlib.reload(main_module)

    fake_result = {
        "user_id": "u1",
        "wardrobe_items": [],
        "preferences": {},
        "locked_item_ids": [],
        "categorized": {},
        "selected_outfit": None,
        "errors": ["Wardrobe is empty"],
    }

    with patch.object(main_module.agent, "invoke", return_value=fake_result):
        from httpx import ASGITransport, AsyncClient
        transport = ASGITransport(app=main_module.app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            res = await ac.post(
                "/generate-outfit",
                json={"user_id": "u1", "wardrobe_items": []},
            )

    assert res.status_code == 422
    detail = res.json()["detail"]
    assert "errors" in detail
    assert "Wardrobe is empty" in detail["errors"]
