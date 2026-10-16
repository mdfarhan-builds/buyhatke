"""Explicit smoke test with isolated, disposable local Redis/PostgreSQL containers.

Run from backend after uv sync: .venv/bin/python scripts/check_services.py
Requires a working Docker daemon and access to the official Docker Hub images.
Does not change .env, start Compose services, or touch existing databases.
"""

import asyncio
import os
import secrets
import subprocess
import time
from concurrent.futures import ThreadPoolExecutor

import asyncpg
from fastapi.testclient import TestClient
from redis import Redis

from pricewise.config import Settings
from pricewise.main import create_app


def run(*args: str, **kwargs) -> str:
    return subprocess.check_output(args, text=True, stderr=subprocess.PIPE, **kwargs).strip()


def main() -> None:
    containers: list[str] = []
    try:
        print("Preparing official Redis 7 and PostgreSQL 17 images…", flush=True)
        with ThreadPoolExecutor(max_workers=2) as executor:
            list(executor.map(lambda image: run("docker", "pull", image), ["redis:7-alpine", "postgres:17-alpine"]))
        password = secrets.token_urlsafe(24)
        # Pass the generated disposable password through the child environment,
        # never through process arguments, printed output, or a repository file.
        container_env = dict(os.environ, POSTGRES_PASSWORD=password)
        pg = run("docker", "run", "--rm", "-d", "-e", "POSTGRES_PASSWORD", "-p", "127.0.0.1::5432", "postgres:17-alpine", env=container_env)
        containers.append(pg)
        rd = run("docker", "run", "--rm", "-d", "-p", "127.0.0.1::6379", "redis:7-alpine")
        containers.append(rd)
        pg_port = run("docker", "port", pg, "5432/tcp").rsplit(":", 1)[1]
        rd_port = run("docker", "port", rd, "6379/tcp").rsplit(":", 1)[1]
        for _ in range(60):
            if subprocess.run(["docker", "exec", pg, "pg_isready", "-U", "postgres"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL).returncode == 0:
                break
            time.sleep(0.2)
        else:
            raise RuntimeError("PostgreSQL readiness timeout")
        redis_url = f"redis://127.0.0.1:{rd_port}/0"
        settings = Settings(
            _env_file=None, feed_path=None,
            redis_url=redis_url,
            database_url=f"postgresql+asyncpg://postgres:{password}@127.0.0.1:{pg_port}/postgres",
            rate_limit_per_minute=1,
        )
        print("Checking API persistence, cache, and rate limiting…", flush=True)
        with TestClient(create_app(settings)) as client:
            health = client.get("/api/health").json()
            assert health["dependencies"]["cache"] == "redis", "Redis did not connect"
            assert health["dependencies"]["audit"] == "postgresql", "PostgreSQL did not connect"
            assert client.post("/api/compare", json={"url": "https://www.amazon.in/dp/B0TEST0001"}).status_code == 200
        with TestClient(create_app(settings)) as client:
            assert client.post("/api/compare", json={"url": "https://www.amazon.in/dp/B0TEST0001"}).status_code == 429, "Rate limiting was not shared across instances"
        with Redis.from_url(redis_url) as redis_client:
            assert len(list(redis_client.scan_iter("pricewise:comparison:*"))) == 1, "No Redis comparison cache entry"

        async def audit_count() -> int:
            connection = await asyncpg.connect(host="127.0.0.1", port=int(pg_port), user="postgres", password=password, database="postgres")
            try:
                return await connection.fetchval("SELECT count(*) FROM pricewise_comparison_audit")
            finally:
                await connection.close()

        assert asyncio.run(audit_count()) == 1, "PostgreSQL audit record was not inserted"
        print("PASS: Redis cache, cross-instance rate limit, PostgreSQL schema and audit persistence.", flush=True)
    finally:
        for container in containers:
            subprocess.run(["docker", "stop", "-t", "1", container], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        print("Disposable integration containers cleaned up.", flush=True)


if __name__ == "__main__":
    main()
