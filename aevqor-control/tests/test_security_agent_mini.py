"""Read-only security agent: auth, allowlist and inspection behavior."""
import base64
import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import security_agent_mini as appmod

client = TestClient(appmod.app)


def auth(password="test-private-pass"):
    raw = base64.b64encode(("admin:" + password).encode()).decode()
    return {"Authorization": "Basic " + raw, "X-AEVQOR-Request": "1"}


def test_auth_required(monkeypatch):
    monkeypatch.setenv("DASHBOARD_PASSWORD", "test-private-pass")
    assert client.get("/").status_code == 401
    assert client.get("/api/repos").status_code == 401
    assert client.get("/api/repos", headers=auth()).status_code == 200


def test_unauthorized_repo_cannot_be_scanned(monkeypatch):
    monkeypatch.setenv("DASHBOARD_PASSWORD", "test-private-pass")
    r = client.post("/api/security/scan", json={"repo": "attacker/repo"}, headers=auth())
    assert r.status_code == 403


def test_explicit_client_confirmation_required(monkeypatch):
    monkeypatch.setenv("DASHBOARD_PASSWORD", "test-private-pass")
    headers = auth()
    del headers["X-AEVQOR-Request"]
    r = client.post("/api/security/scan", json={"repo": "LuisJose713/WS_FINFLOW"}, headers=headers)
    assert r.status_code == 400


def test_report_uses_paths_not_file_contents(monkeypatch):
    monkeypatch.setenv("DASHBOARD_PASSWORD", "test-private-pass")
    async def fake_get(_client, path):
        if path.endswith("/repos/LuisJose713/WS_FINFLOW"):
            return {"default_branch": "main"}
        assert "/git/trees/main?recursive=1" in path
        return {"tree": [
            {"type": "blob", "path": ".env"},
            {"type": "blob", "path": "src/Main.java"},
            {"type": "blob", "path": ".gitignore"}]}
    monkeypatch.setattr(appmod, "github_get", fake_get)
    r = client.post("/api/security/scan",
        json={"repo": "LuisJose713/WS_FINFLOW"}, headers=auth())
    assert r.status_code == 200, r.text
    obj = r.json()
    assert obj["agent"] == "security"
    assert obj["files_examined"] == 3
    assert any(x["severity"] == "high" for x in obj["findings"])
    assert ".env" not in str(obj["findings"])


def test_wrong_password_rejected(monkeypatch):
    monkeypatch.setenv("DASHBOARD_PASSWORD", "test-private-pass")
    assert client.get("/api/repos", headers=auth("incorrect")).status_code == 401
