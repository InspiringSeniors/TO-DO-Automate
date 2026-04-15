"""
Production Gunicorn config.
Usage: gunicorn -c gunicorn.conf.py app.main:app
"""
import os
import multiprocessing

# ── Server socket ──────────────────────────────────────────────────────────────
host  = os.getenv("HOST", "0.0.0.0")
port  = os.getenv("PORT", "8000")
bind  = f"{host}:{port}"

# ── Worker processes ───────────────────────────────────────────────────────────
# Use uvicorn workers for ASGI (FastAPI)
worker_class = "uvicorn.workers.UvicornWorker"
# 2-4 workers per CPU core is the standard recommendation
workers      = int(os.getenv("WEB_CONCURRENCY", max(2, multiprocessing.cpu_count())))
threads      = 1

# ── Timeouts ───────────────────────────────────────────────────────────────────
timeout      = 120          # worker silent for 120s → restart
keepalive    = 5
graceful_timeout = 30

# ── Logging ────────────────────────────────────────────────────────────────────
accesslog    = "-"          # stdout
errorlog     = "-"          # stderr
loglevel     = os.getenv("LOG_LEVEL", "info")
access_log_format = '%(h)s "%(r)s" %(s)s %(b)s %(D)sµs'

# ── Process naming ─────────────────────────────────────────────────────────────
proc_name    = "todo-automate-api"
wsgi_app     = "app.main:app"

# ── Security ───────────────────────────────────────────────────────────────────
limit_request_line    = 8190
limit_request_fields  = 100
