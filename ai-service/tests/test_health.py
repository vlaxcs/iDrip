"""Smoke tests for the FastAPI service endpoints."""
import pytest


@pytest.mark.asyncio
async def test_health_returns_ok(client):
    res = await client.get("/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["service"] == "ai-service"


@pytest.mark.asyncio
async def test_root_returns_running_message(client):
    res = await client.get("/")
    assert res.status_code == 200
    assert "running" in res.json()["message"].lower()
