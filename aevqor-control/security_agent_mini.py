"""AEVQOR Control: lanzamiento independiente del agente Seguridad (solo lectura).
Uso: uvicorn security_agent_mini:app --host 0.0.0.0 --port 8000
"""
from datetime import datetime, timezone
import os
import secrets
from urllib.parse import quote

import httpx
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from pydantic import BaseModel

load_dotenv()
app = FastAPI(title="AEVQOR Control – Agente Seguridad", version="0.1.1")
basic = HTTPBasic(auto_error=False)
ALLOWED = tuple(x.strip() for x in os.getenv(
    "GITHUB_REPOS", "LuisJose713/finflow,LuisJose713/WS_FINFLOW,LuisJose713/Finflow_Swift"
).split(",") if x.strip())


def authorize(credentials: HTTPBasicCredentials | None = Depends(basic)):
    password = os.getenv("DASHBOARD_PASSWORD", "")
    if not password or not credentials or not (
        secrets.compare_digest(credentials.username, "admin")
        and secrets.compare_digest(credentials.password, password)
    ):
        raise HTTPException(401, "Credenciales inválidas", headers={"WWW-Authenticate": "Basic"})
    return True


class ScanRequest(BaseModel):
    repo: str


PAGE = """<!doctype html><html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AEVQOR Control | Seguridad</title>
<style>
:root{color-scheme:dark;font-family:Inter,system-ui,-apple-system,sans-serif}
body{margin:0;background:#080d1a;color:#edf2ff}
main{max-width:960px;margin:0 auto;padding:clamp(24px,5vw,60px)}
header{display:flex;align-items:center;justify-content:space-between;gap:16px}
.brand{letter-spacing:.22em;font-size:13px;font-weight:750;color:#b4c3ed}
.pill{background:#182540;border:1px solid #334465;border-radius:99px;padding:7px 11px;color:#b1c6ef;font-size:12px}
h1{font-size:clamp(34px,6vw,64px);letter-spacing:-.06em;margin:60px 0 12px}
p{color:#a2b1d0;line-height:1.7}
.panel{background:#101b30;border:1px solid #273957;border-radius:22px;padding:clamp(22px,4vw,38px);margin-top:32px}
label{display:block;margin:0 0 12px;color:#bacaf0;font-size:13px;font-weight:600}
select{background:#091227;color:#f3f7ff;border:1px solid #3b4f70;border-radius:12px;padding:14px;width:100%;font:inherit}
button{background:#d3b87a;color:#1a1920;border:0;border-radius:12px;padding:14px 22px;font-weight:800;font:inherit;cursor:pointer;margin-top:18px}
button:disabled{opacity:.5;cursor:wait}
pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.55;background:#081122;border-radius:14px;padding:18px;font-size:12px;color:#c3d4f6}
small{color:#7c90af}
</style></head><body><main>
<header><span class="brand">AEVQOR / CONTROL</span><span class="pill">READ ONLY · v0.1.1</span></header>
<h1>Engineering,<br>under control.</h1>
<p>Agente Seguridad: revisión preliminar de nombres de archivos y controles del repositorio.
No ejecuta código, no inspecciona secretos y no modifica GitHub.</p>
<section class="panel"><label for="repo">REPOSITORIO AUTORIZADO</label>
<select id="repo"></select><button id="run">Ejecutar agente Seguridad</button>
<p id="status" role="status">Listo para analizar.</p><pre id="result" hidden></pre>
<small>La autenticación es privada. Mantén el puerto de Codespaces en modo Private.</small></section></main>
<script>
const select=document.getElementById('repo'),run=document.getElementById('run'),
status=document.getElementById('status'),out=document.getElementById('result');
async function load(){
 const r=await fetch('/api/repos');
 if(!r.ok){status.textContent='Autenticación requerida o configuración incompleta';return;}
 const data=await r.json();
 for(const name of data.repos){const opt=document.createElement('option');opt.value=name;opt.textContent=name;select.append(opt);}
}
run.onclick=async()=>{
 run.disabled=true;out.hidden=true;status.textContent='Revisando metadatos de GitHub…';
 try{const r=await fetch('/api/security/scan',{method:'POST',
 headers:{'Content-Type':'application/json','X-AEVQOR-Request':'1'},
 body:JSON.stringify({repo:select.value})});
 const data=await r.json();
 if(!r.ok)throw new Error(typeof data.detail==='string'?data.detail:'Error HTTP '+r.status);
 out.textContent=JSON.stringify(data,null,2);out.hidden=false;
 status.textContent='Análisis completado (solo metadatos).';
 }catch(e){status.textContent='Error: '+e.message;}
 finally{run.disabled=false;}
};load();
</script></body></html>"""


@app.get("/", response_class=HTMLResponse)
async def home():
    return HTMLResponse(PAGE, headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"})


@app.get("/api/repos")
async def repos(_: bool = Depends(authorize)):
    return {"repos": ALLOWED}


async def github_get(client: httpx.AsyncClient, path: str) -> dict:
    headers = {"Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28"}
    token = os.getenv("GITHUB_TOKEN", "").strip()
    if token:
        headers["Authorization"] = "Bearer " + token
    response = await client.get("https://api.github.com" + path, headers=headers)
    if response.status_code in (401, 403, 404):
        raise HTTPException(502, "GitHub no permitió leer este repositorio. Verifica permisos de solo lectura.")
    response.raise_for_status()
    return response.json()


@app.post("/api/security/scan")
async def security_scan(
    body: ScanRequest,
    _: bool = Depends(authorize),
    confirmation: str | None = Header(None, alias="X-AEVQOR-Request")
):
    if confirmation != "1":
        raise HTTPException(400, "Falta confirmación del cliente.")
    if body.repo not in ALLOWED or body.repo.count("/") != 1:
        raise HTTPException(403, "Repositorio fuera de la lista autorizada.")
    owner, name = body.repo.split("/")
    async with httpx.AsyncClient(timeout=25, follow_redirects=False) as client:
        metadata = await github_get(client, f"/repos/{quote(owner)}/{quote(name)}")
        branch = quote(metadata["default_branch"], safe="")
        tree = await github_get(client, f"/repos/{quote(owner)}/{quote(name)}/git/trees/{branch}?recursive=1")
    paths = [entry["path"] for entry in tree.get("tree", []) if entry.get("type") == "blob"]
    lower = {p.lower() for p in paths}
    suspicious = [p for p in lower if p.rsplit("/", 1)[-1] in
                  {".env", "id_rsa", "credentials.json"} or p.endswith((".pem", ".p12", ".pfx", ".key"))]
    findings = []
    def add(level, title, note):
        findings.append({"severity": level, "title": title, "detail": note})
    if suspicious:
        add("high", "Posibles archivos sensibles", f"{len(suspicious)} rutas sospechosas; contenido no inspeccionado.")
    else:
        add("good", "Sin nombres de credenciales evidentes", "No equivale a un escáner de secretos.")
    if ".gitignore" not in lower:
        add("medium", "No se detectó .gitignore", "Ignora archivos de entorno y credenciales.")
    if not any(p in lower for p in (".github/dependabot.yml", ".github/dependabot.yaml")):
        add("low", "Dependabot no detectado", "Considera activar alertas y actualizaciones de dependencias.")
    if not any(p in lower for p in ("security.md", ".github/security.md")):
        add("low", "Política SECURITY.md no detectada", "Documenta un canal de reporte de vulnerabilidades.")
    if tree.get("truncated"):
        add("high", "Árbol truncado por GitHub", "Resultados parciales: no se cubrieron todas las rutas.")
    return {
        "repo": body.repo, "agent": "security", "mode": "Metadatos GitHub; solo lectura",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "files_examined": len(paths), "findings": findings,
        "disclaimer": "No se analizó código, dependencias, vulnerabilidades ni secretos reales."
    }
