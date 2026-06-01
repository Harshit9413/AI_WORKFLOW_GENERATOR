import logging
from pathlib import Path

import chromadb

from app.rag.patterns import PATTERNS

logger = logging.getLogger(__name__)

_RAG_STORE_PATH = str(Path(__file__).parent.parent.parent / "rag_store")
_COLLECTION_NAME = "architecture_patterns"
_client: chromadb.ClientAPI | None = None
_collection = None


def _get_collection():
    global _client, _collection
    if _collection is not None:
        return _collection
    try:
        _client = chromadb.PersistentClient(path=_RAG_STORE_PATH)
        _collection = _client.get_or_create_collection(_COLLECTION_NAME)
        _seed_if_empty(_collection)
        return _collection
    except Exception:
        logger.warning("RAG store unavailable", exc_info=True)
        return None


def _seed_if_empty(collection) -> None:
    if collection.count() >= len(PATTERNS):
        return
    collection.add(
        documents=PATTERNS,
        ids=[f"pattern_{i}" for i in range(len(PATTERNS))],
    )
    logger.info("RAG store seeded with %d patterns", len(PATTERNS))


def query_patterns(prompt: str, n_results: int = 2) -> list[str]:
    try:
        collection = _get_collection()
        if collection is None:
            return []
        count = collection.count()
        if count == 0:
            return []
        results = collection.query(
            query_texts=[prompt],
            n_results=min(n_results, count),
        )
        return results["documents"][0] if results["documents"] else []
    except Exception:
        logger.warning("RAG query failed", exc_info=True)
        return []
