"""No-op vector database backend.

Selected when ``VECTOR_DB`` is empty or ``'none'`` (the Sakrylle slim-profile
default). Open WebUI's always-on routers (``routers/files.py`` for file-deletion
cleanup, ``tools/builtin.py`` for built-in tools) import the vector-DB factory at
module load, so a backend must always be constructible — even when retrieval /
RAG / Memories are disabled and no real vector store is configured.

Every method is a no-op: collection checks report empty, reads return ``None``,
and writes/deletes do nothing. This lets the slim build run with no vector
store (and therefore no chromadb / torch / sentence-transformers) while leaving
the surrounding code paths import- and call-safe. Re-enable a real store by
setting ``VECTOR_DB`` (e.g. ``chroma``) and installing its client.
"""

from typing import Dict, List, Optional, Union

from open_webui.retrieval.vector.main import (
    GetResult,
    SearchResult,
    VectorDBBase,
    VectorItem,
)


class NoOpVectorClient(VectorDBBase):
    """A vector backend that stores nothing and returns empty results."""

    def has_collection(self, collection_name: str) -> bool:
        return False

    def delete_collection(self, collection_name: str) -> None:
        return None

    def insert(self, collection_name: str, items: List[VectorItem]) -> None:
        return None

    def upsert(self, collection_name: str, items: List[VectorItem]) -> None:
        return None

    def search(
        self,
        collection_name: str,
        vectors: List[List[Union[float, int]]],
        filter: Optional[Dict] = None,
        limit: int = 10,
    ) -> Optional[SearchResult]:
        return None

    def query(
        self, collection_name: str, filter: Dict, limit: Optional[int] = None
    ) -> Optional[GetResult]:
        return None

    def get(self, collection_name: str) -> Optional[GetResult]:
        return None

    def delete(
        self,
        collection_name: str,
        ids: Optional[List[str]] = None,
        filter: Optional[Dict] = None,
    ) -> None:
        return None

    def reset(self) -> None:
        return None
