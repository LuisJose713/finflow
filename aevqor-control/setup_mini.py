"""Generate a local, untracked password for AEVQOR mini."""
from pathlib import Path
import secrets

path = Path(__file__).resolve().parent / ".env"
if path.exists():
    print(".env ya existe: no se sobrescribió.")
else:
    password = secrets.token_urlsafe(30)
    path.write_text(
        "DASHBOARD_PASSWORD=" + password + "\n"
        "GITHUB_REPOS=LuisJose713/WS_FINFLOW,LuisJose713/finflow,LuisJose713/Finflow_Swift\n"
        "GITHUB_TOKEN=\n",
        encoding="utf-8",
    )
    try:
        path.chmod(0o600)
    except OSError:
        pass
    print(".env creado. Consulta la contraseña con: grep '^DASHBOARD_PASSWORD=' .env")
