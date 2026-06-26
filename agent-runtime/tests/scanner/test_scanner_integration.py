"""Integration tests for RepositoryScanner."""

from __future__ import annotations

import json
from pathlib import Path

from tests.conftest import scan_repo


def test_react_project_scan(tmp_path: Path) -> None:
    root = tmp_path / "react-app"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps(
            {
                "name": "react-app",
                "dependencies": {"react": "^18.0.0", "react-dom": "^18.0.0"},
                "devDependencies": {"vite": "^5.0.0", "vitest": "^1.0.0"},
                "scripts": {"dev": "vite", "build": "vite build", "start": "vite preview"},
            }
        ),
        encoding="utf-8",
    )
    (root / "package-lock.json").write_text("{}", encoding="utf-8")
    (root / ".env.example").write_text("VITE_API_URL=\n", encoding="utf-8")
    (root / "src").mkdir()
    (root / "src" / "App.jsx").write_text("export default function App() {}", encoding="utf-8")

    result = scan_repo(root)
    assert "react" in result.frameworks.frontend
    assert result.runtime.primary == "node.js"
    assert result.packageManager.primary == "npm"
    assert result.commands.build == "vite build"
    assert "VITE_API_URL" in result.environment.variables
    assert result.architecture.primary == "frontend_only"


def test_nextjs_project_scan(tmp_path: Path) -> None:
    root = tmp_path / "next-app"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"next": "14.0.0", "react": "18.0.0"},
                "scripts": {"dev": "next dev", "build": "next build", "start": "next start"},
            }
        ),
        encoding="utf-8",
    )
    (root / "next.config.js").write_text("module.exports = {}", encoding="utf-8")
    (root / "pnpm-lock.yaml").write_text("lockfileVersion: 1\n", encoding="utf-8")

    result = scan_repo(root)
    assert "next.js" in result.frameworks.frontend
    assert result.packageManager.primary == "pnpm"
    assert result.commands.start == "next start"


def test_express_api_scan(tmp_path: Path) -> None:
    root = tmp_path / "express-api"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps(
            {
                "dependencies": {"express": "^4.18.0", "mongoose": "^8.0.0", "jsonwebtoken": "^9.0.0"},
                "scripts": {"start": "node server.js"},
            }
        ),
        encoding="utf-8",
    )
    (root / "server.js").write_text("const express = require('express')", encoding="utf-8")
    (root / "Dockerfile").write_text("FROM node:20", encoding="utf-8")

    result = scan_repo(root)
    assert "express" in result.frameworks.backend
    assert any(item.name == "Mongoose" for item in result.database.detected)
    assert result.health.has_dockerfile is True
    assert "api_server" in result.architecture.types


def test_django_application_scan(tmp_path: Path) -> None:
    root = tmp_path / "django-app"
    root.mkdir()
    (root / "manage.py").write_text("#!/usr/bin/env python", encoding="utf-8")
    (root / "requirements.txt").write_text("django==5.0.0\npsycopg2-binary\n", encoding="utf-8")
    (root / ".env.sample").write_text("DATABASE_URL=\nSECRET_KEY=\n", encoding="utf-8")

    result = scan_repo(root)
    assert "django" in result.frameworks.backend
    assert result.runtime.primary == "python"
    assert result.commands.dev == "python manage.py runserver"
    assert {"DATABASE_URL", "SECRET_KEY"} <= set(result.environment.variables)


def test_monorepo_scan(tmp_path: Path) -> None:
    root = tmp_path / "monorepo"
    root.mkdir()
    (root / "package.json").write_text(
        json.dumps({"private": True, "workspaces": ["packages/*"]}),
        encoding="utf-8",
    )
    (root / "pnpm-workspace.yaml").write_text("packages:\n  - 'packages/*'\n", encoding="utf-8")
    packages = root / "packages"
    (packages / "web").mkdir(parents=True)
    (packages / "api").mkdir(parents=True)
    (packages / "web" / "package.json").write_text('{"name":"web","dependencies":{"react":"18.0.0"}}', encoding="utf-8")
    (packages / "api" / "package.json").write_text('{"name":"api","dependencies":{"express":"4.0.0"}}', encoding="utf-8")

    result = scan_repo(root)
    assert result.repository.is_monorepo is True
    assert "monorepo" in result.architecture.types
