# AEVQOR CONTROL

**Precision. Architecture. Innovation.**

Engineering Operations Center para supervisar tus repositorios desde **iPad, Mac o cualquier navegador**. Primera versión funcional de un proyecto de portafolio, con panel responsive, autenticación privada, conexión GitHub y **agentes de análisis supervisados**.

> **Estado V0.1:** MVP de monitoreo y análisis de metadatos, no una plataforma de ejecución remota ni un agente autónomo capaz de escribir código. No hace commits, merges, despliegues ni ejecuta tests. Esas acciones requieren una fase posterior con sandbox, políticas y aprobación explícita.

## Funciones incluidas

- Inicio de sesión con cookie firmada, HTTP-only, SameSite strict y expiración a 12 horas.
- Panel de repositorios GitHub, pull requests (conteo inicial, hasta 30) y estado del último workflow.
- **Cuatro agentes:** arquitectura, QA, seguridad y documentación. Análisis estático de nombres de archivos/estructura, no del contenido del código.
- Cola persistente SQLite: `pending → running → completed/failed` o `pending → rejected`.
- **Human-in-the-loop:** ningún agente se ejecuta antes de aprobarlo; sin permisos de escritura a GitHub.
- Modo demo claramente identificado para empezar sin token.
- IA **opcional**, apagada de fábrica: OpenAI compatible (API con pago independiente) u Ollama (en entorno accesible de forma privada). El modelo solo recibe hallazgos sintéticos, nunca el código fuente.
- Contenedor Codespaces con puerto privado, pipeline CI y pruebas automatizadas.

## Inicio rápido en Mac/Linux/Windows

Requisitos: Python 3.11+ y Git.

```bash
python -m venv .venv
source .venv/bin/activate             # Windows PowerShell: .venv\Scripts\Activate.ps1
pip install -e '.[dev]'
python scripts/setup.py               # Crea .env con contraseña aleatoria
# Para recuperar la contraseña: grep '^DASHBOARD_PASSWORD=' .env
uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Abre **http://localhost:8000**. La primera ejecución usa **MODO DEMO**: los valores no son reales. Para datos reales, cambia `DEMO_MODE=false` en tu `.env` y reinicia.

## Desde iPad Pro usando GitHub Codespaces

1. Crea un repositorio **privado** nuevo en GitHub, llamado `aevqor-control`.
2. Sube el contenido de esta carpeta al repositorio (no incluyas `.env`).
3. Abre el repositorio en Safari, toca **Code → Codespaces → Create codespace**.
4. El devcontainer instala dependencias y crea `.env` en el servidor de Codespaces. Recupera tu contraseña en el terminal privado con `grep '^DASHBOARD_PASSWORD=' .env`.
5. Ejecuta `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
6. Abre el puerto reenviado **8000** manteniendo su visibilidad **Private**. Nunca lo hagas público sin endurecer autenticación y despliegue.

> Codespaces corre en Linux remoto. El iPad muestra la interfaz y administra las aprobaciones; **el procesador M5 no está ejecutando los diagnósticos**.

## Vincular GitHub real

Edita `.env` (en el equipo/servidor, nunca en Git):

```dotenv
DEMO_MODE=false
GITHUB_REPOS=LuisJose713/finflow,LuisJose713/WS_FINFLOW,LuisJose713/Finflow_Swift
GITHUB_TOKEN=
```

Si solo consultas repositorios públicos, la API de GitHub puede funcionar sin token, sujeta a límites. Para repositorios privados crea un **fine-grained personal access token** con acceso a **los repos seleccionados** y permisos de solo lectura para **Metadata**, **Contents**, **Pull requests** y **Actions**; asigna el token como secreto de Codespaces o variable de entorno, no lo pegues en un issue ni lo subas al repositorio.

Los datos de GitHub aparecen con modo `GITHUB LIVE`; los fallos de permisos/conexión se indican, sin inventar métricas.

## IA opcional: Mac con Ollama

Para generar recomendaciones con un LLM privado compatible con OpenAI:

```dotenv
AI_PROVIDER=ollama
AI_MODEL=qwen2.5-coder:7b
AI_BASE_URL=http://127.0.0.1:11434/v1
```

Instala y ejecuta Ollama y el modelo **en la misma máquina que ejecute este backend**. Si el backend se ejecuta en Codespaces, `127.0.0.1` es el contenedor remoto, **no tu Mac**. Evita exponer Ollama a internet: usa una red privada o ejecuta el backend en tu Mac.

Para usar un proveedor cloud compatible con OpenAI (posible costo separado del plan ChatGPT Plus):

```dotenv
AI_PROVIDER=openai
AI_MODEL=MODELO_COMPATIBLE_ELEGIDO
AI_API_KEY=TU_CLAVE_PRIVADA
ALLOW_CLOUD_AI=true
```

Por seguridad solo se transmiten hallazgos resumidos. La app **no envía archivos fuente** al modelo y nunca lo habilita automáticamente.

## Estructura

```
app/main.py          Endpoints API, sesión y aprobaciones
app/github_client.py Lectura de repositorios, PRs, Actions y árboles Git
app/agents.py        Diagnósticos y capa opcional de IA
app/store.py         Tareas y bitácora en SQLite
app/static/          Dashboard responsive sin CDN
.devcontainer/       Entorno listo para Codespaces
.github/workflows/   Tests y lint en GitHub Actions
docs/                Arquitectura, seguridad y roadmap
```

## Validación

```bash
ruff check .
pytest -q
```

## Seguridad

El servidor tiene autenticación y protecciones básicas, pero es un **MVP personal**: no está auditado ni endurecido para internet público. Mantén el puerto privado, configura GitHub con solo lectura, gestiona secretos fuera del repositorio y no conectes credenciales empresariales sin autorización. Detalles en [docs/SECURITY.md](docs/SECURITY.md).

## Licencia

Código base creado como punto de partida; puedes adaptarlo para tu portafolio y proyectos personales.