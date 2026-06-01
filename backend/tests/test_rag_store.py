import pytest


def test_query_patterns_returns_list_of_strings(tmp_path, monkeypatch):
    """Real ChromaDB query over seeded patterns returns string results."""
    from app.rag import store

    # Point store at a fresh temp directory and reset cached globals
    monkeypatch.setattr(store, "_RAG_STORE_PATH", str(tmp_path))
    store._client = None
    store._collection = None

    results = store.query_patterns("ecommerce store with cart and checkout", n_results=2)
    assert isinstance(results, list)
    assert len(results) >= 1
    assert all(isinstance(r, str) for r in results)


def test_query_patterns_returns_empty_on_collection_failure(monkeypatch):
    """If _get_collection returns None, query_patterns returns []."""
    from app.rag import store
    monkeypatch.setattr(store, "_get_collection", lambda: None)
    results = store.query_patterns("anything")
    assert results == []


def test_query_patterns_returns_empty_on_exception(monkeypatch):
    """If query raises, query_patterns returns [] without crashing."""
    from app.rag import store

    def _boom():
        raise RuntimeError("db is down")

    monkeypatch.setattr(store, "_get_collection", _boom)
    results = store.query_patterns("anything")
    assert results == []


def test_seed_is_idempotent(tmp_path, monkeypatch):
    """Calling _get_collection twice does not duplicate documents."""
    from app.rag import store
    from app.rag.patterns import PATTERNS

    monkeypatch.setattr(store, "_RAG_STORE_PATH", str(tmp_path))
    store._client = None
    store._collection = None

    store._get_collection()
    store._client = None
    store._collection = None
    coll = store._get_collection()

    assert coll.count() == len(PATTERNS)
