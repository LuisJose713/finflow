# AEVQOR Control — Agente Seguridad (Codespaces)

> **Alcance de esta rama:** ejecutor compacto y comprobado para consultar metadatos de seguridad. El dashboard completo v0.1 se entregó como ZIP en ChatGPT y todavía no está publicado íntegramente en este repositorio.

# Agente Seguridad de AEVQOR Control — iPad / Codespaces

**Estado:** ejecutor compacto para lectura de metadatos; no sustituye el dashboard completo del ZIP v0.1.

## Arranque

Abre un Codespace en la rama `aevqor-control-v0.1` del repositorio privado `LuisJose713/finflow`.
En el terminal:

```bash
cd aevqor-control
python -m pip install -r requirements-mini.txt
python setup_mini.py
grep '^DASHBOARD_PASSWORD=' .env
uvicorn security_agent_mini:app --host 0.0.0.0 --port 8000
```

En la pestaña **Ports** abre el puerto **8000** con visibilidad **Private**.
El navegador pedirá credenciales: usuario `admin`, contraseña obtenida en el terminal.
Elige `LuisJose713/WS_FINFLOW` y pulsa **Ejecutar agente Seguridad**.

## Acceso al repositorio privado WS_FINFLOW

Crea un token de GitHub *fine-grained* limitado a `WS_FINFLOW` con **Metadata: read** y **Contents: read**.
Guárdalo en un **Codespaces Secret** (o en la variable de entorno local `GITHUB_TOKEN`), nunca en Git.
Si lo guardas como secreto con otro nombre, expórtalo como `GITHUB_TOKEN` antes de arrancar Uvicorn.

## Límites y seguridad

- La operación es una lectura de nombres de archivo y configuración GitHub; **NO** busca vulnerabilidades en código ni analiza dependencias.
- Nunca escribir en GitHub ni ejecutar comandos provenientes del repositorio analizado.
- El dashboard usa Basic Auth: mantén el puerto **Private** y HTTPS de Codespaces.
- `.env` debe permanecer fuera de Git (ya está ignorado).
- El proyecto completo de dashboard v0.1 se entregó como ZIP separado; este ejecutor es una entrada sencilla al agente de seguridad.
