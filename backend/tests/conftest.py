import os

import pytest

os.environ.setdefault("OPENAI_API_KEY", "test-key")
os.environ.setdefault("LANGCHAIN_TRACING_V2", "false")


@pytest.fixture(autouse=True)
def init_test_db():
    from app.database import init_db
    init_db()
