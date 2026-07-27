"""Minimal Python client for the frees REST API.

Covers the calls an automation or notebook actually needs — health, check,
solve — against either deployment mode: the async ``api`` profile (202 + jobId,
polled at ``/api/jobs/{id}``) and the synchronous default profile (inline
response). A failed solve raises :class:`SolveFailed` carrying the full
diagnostics envelope (per-equation residuals at the point of failure, block
structure, failing block index) that the backend ships since the diagnostics
release.

Usage::

    from frees_client import FreesClient

    frees = FreesClient("http://localhost:8080")
    result = frees.solve("x^2 + y^3 = 77\\nx / y = 1.23456")
    print(frees.variables(result))          # {'x': 4.694..., 'y': 3.802...}
"""

from __future__ import annotations

import time
from typing import Any

import requests

__all__ = ["FreesClient", "FreesError", "SolveFailed"]


class FreesError(RuntimeError):
    """Transport-level or protocol-level failure talking to a frees backend."""


class SolveFailed(FreesError):
    """The solver rejected or failed the document.

    ``envelope`` holds the full failure payload: ``error``, ``errorLine``,
    ``failedBlockIndex``, ``blocks``, and ``residuals`` evaluated at the point
    of failure — everything the web UI's Diagnostics panel renders.
    """

    def __init__(self, envelope: dict[str, Any]):
        super().__init__(envelope.get("error") or "solve failed")
        self.envelope = envelope


class FreesClient:
    """Small requests-based wrapper over a frees backend."""

    def __init__(self, base_url: str = "http://localhost:8080",
                 timeout: float = 90.0, session: requests.Session | None = None):
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout
        self._http = session or requests.Session()

    # -- endpoints ----------------------------------------------------------

    def health(self) -> dict[str, Any]:
        """Topology health report (GET /api/health)."""
        return self._get_json("/api/health")

    def check(self, text: str) -> dict[str, Any]:
        """Syntax + degrees-of-freedom check without solving (POST /api/check)."""
        response = self._http.post(f"{self.base_url}/api/check",
                                   json={"text": text}, timeout=self.timeout)
        return self._json_or_raise(response)

    def solve(self, text: str, *, raise_on_failure: bool = True,
              poll_interval: float = 0.4, **extra: Any) -> dict[str, Any]:
        """Solves a document and returns the response envelope.

        Handles both deployment modes transparently: a 202 answer is polled at
        ``/api/jobs/{jobId}`` until it settles. Keyword arguments are passed
        through into the request body (``variableInfo``, ``findAllSolutions``,
        ``displayUnitSystem``, ``stopCriteria``, ...).
        """
        body: dict[str, Any] = {"text": text, **extra}
        response = self._http.post(f"{self.base_url}/api/solve",
                                   json=body, timeout=self.timeout)
        if response.status_code == 202:
            envelope = self._poll_job(response.json()["jobId"], poll_interval)
        else:
            envelope = self._json_or_raise(response, allow_client_error=True)
        if raise_on_failure and not envelope.get("success", False):
            raise SolveFailed(envelope)
        return envelope

    # -- helpers ------------------------------------------------------------

    @staticmethod
    def variables(envelope: dict[str, Any]) -> dict[str, float]:
        """``{name: value}`` over the envelope's variable list."""
        return {v["name"]: v["value"] for v in envelope.get("variables", [])}

    def _poll_job(self, job_id: str, poll_interval: float) -> dict[str, Any]:
        deadline = time.monotonic() + self.timeout
        while time.monotonic() < deadline:
            state = self._get_json(f"/api/jobs/{job_id}")
            status = state.get("status")
            if status == "COMPLETED":
                return state.get("result") or {}
            if status == "FAILED":
                return {"success": False, "error": state.get("error") or "job failed"}
            time.sleep(poll_interval)
        raise FreesError(f"job {job_id} did not settle within {self.timeout}s")

    def _get_json(self, path: str) -> dict[str, Any]:
        response = self._http.get(f"{self.base_url}{path}", timeout=self.timeout)
        return self._json_or_raise(response)

    def _json_or_raise(self, response: requests.Response,
                       allow_client_error: bool = False) -> dict[str, Any]:
        # 4xx solver rejections (400 syntax, 422 solver failure) still carry a
        # response envelope worth surfacing; other statuses are transport errors.
        if response.ok or (allow_client_error and response.status_code in (400, 422)):
            try:
                return response.json()
            except ValueError as e:
                raise FreesError(f"non-JSON response ({response.status_code})") from e
        raise FreesError(f"HTTP {response.status_code}: {response.text[:200]}")
