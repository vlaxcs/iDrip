"""Shared pytest fixtures for ai-service tests."""
import os
import sys
from pathlib import Path

# Add ai-service root to the import path so `import main` works
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

import pytest
from httpx import ASGITransport, AsyncClient


@pytest.fixture
async def client():
    """Async HTTP client bound to the FastAPI app — bypasses TestClient quirks with LangChain."""
    # Reimport inside the fixture so env-var changes in tests take effect
    import importlib
    import main as main_module
    importlib.reload(main_module)
    transport = ASGITransport(app=main_module.app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def sample_wardrobe():
    """A minimal wardrobe with one item per required category."""
    return [
        {"id": "i1", "name": "white tee", "category": "tops", "primaryColor": "#fff", "formality": 3, "aiConfidence": 0.9},
        {"id": "i2", "name": "blue jeans", "category": "bottoms", "primaryColor": "#1e3a8a", "formality": 3, "aiConfidence": 0.9},
        {"id": "i3", "name": "white sneakers", "category": "shoes", "primaryColor": "#fff", "formality": 3, "aiConfidence": 0.9},
    ]
