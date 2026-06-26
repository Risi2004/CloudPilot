"""Shared package and framework knowledge for deterministic detection."""

from __future__ import annotations

FRAMEWORK_RULES: dict[str, dict[str, object]] = {
    "react": {"category": "frontend", "packages": {"react"}, "files": set()},
    "next.js": {"category": "frontend", "packages": {"next"}, "files": {"next.config.js", "next.config.mjs", "next.config.ts"}},
    "vue": {"category": "frontend", "packages": {"vue"}, "files": set()},
    "angular": {"category": "frontend", "packages": {"@angular/core"}, "files": {"angular.json"}},
    "svelte": {"category": "frontend", "packages": {"svelte"}, "files": set()},
    "astro": {"category": "frontend", "packages": {"astro"}, "files": {"astro.config.mjs", "astro.config.ts"}},
    "remix": {"category": "frontend", "packages": {"@remix-run/react", "@remix-run/node"}, "files": set()},
    "express": {"category": "backend", "packages": {"express"}, "files": set()},
    "nestjs": {"category": "backend", "packages": {"@nestjs/core"}, "files": set()},
    "fastify": {"category": "backend", "packages": {"fastify"}, "files": set()},
    "koa": {"category": "backend", "packages": {"koa"}, "files": set()},
    "hono": {"category": "backend", "packages": {"hono"}, "files": set()},
    "django": {"category": "backend", "packages": {"django"}, "files": {"manage.py"}},
    "flask": {"category": "backend", "packages": {"flask"}, "files": set()},
    "laravel": {"category": "backend", "packages": {"laravel/framework"}, "files": {"artisan"}},
    "spring boot": {"category": "backend", "packages": set(), "files": set()},
    "asp.net": {"category": "backend", "packages": set(), "files": set()},
    "ruby on rails": {"category": "backend", "packages": {"rails"}, "files": {"config/application.rb"}},
}

DATABASE_PACKAGES: dict[str, dict[str, str]] = {
    "mongodb": {"name": "MongoDB", "category": "database"},
    "mongoose": {"name": "Mongoose", "category": "orm"},
    "pg": {"name": "PostgreSQL", "category": "database"},
    "postgres": {"name": "PostgreSQL", "category": "database"},
    "postgresql": {"name": "PostgreSQL", "category": "database"},
    "mysql2": {"name": "MySQL", "category": "database"},
    "mysql": {"name": "MySQL", "category": "database"},
    "mariadb": {"name": "MariaDB", "category": "database"},
    "sqlite3": {"name": "SQLite", "category": "database"},
    "better-sqlite3": {"name": "SQLite", "category": "database"},
    "redis": {"name": "Redis", "category": "cache"},
    "ioredis": {"name": "Redis", "category": "cache"},
    "firebase": {"name": "Firebase", "category": "baas"},
    "firebase-admin": {"name": "Firebase", "category": "baas"},
    "@supabase/supabase-js": {"name": "Supabase", "category": "baas"},
    "supabase": {"name": "Supabase", "category": "baas"},
    "@aws-sdk/client-dynamodb": {"name": "DynamoDB", "category": "database"},
    "prisma": {"name": "Prisma", "category": "orm"},
    "@prisma/client": {"name": "Prisma", "category": "orm"},
    "drizzle-orm": {"name": "Drizzle ORM", "category": "orm"},
    "sequelize": {"name": "Sequelize", "category": "orm"},
    "typeorm": {"name": "TypeORM", "category": "orm"},
}

AUTH_PACKAGES = {
    "passport",
    "jsonwebtoken",
    "next-auth",
    "@auth/core",
    "@clerk/nextjs",
    "firebase-admin",
    "auth0",
    "@supabase/auth-helpers-nextjs",
}

API_PACKAGES = {
    "express",
    "fastify",
    "koa",
    "hono",
    "@nestjs/core",
    "axios",
    "got",
    "graphql",
    "@trpc/server",
}

TEST_PACKAGES = {
    "jest",
    "vitest",
    "mocha",
    "chai",
    "pytest",
    "unittest",
    "cypress",
    "playwright",
    "@playwright/test",
    "testing-library",
    "@testing-library/react",
}

BUILD_TOOL_PACKAGES = {
    "vite",
    "webpack",
    "rollup",
    "esbuild",
    "parcel",
    "turbo",
    "nx",
    "gulp",
    "grunt",
}

LANGUAGE_EXTENSIONS: dict[str, list[str]] = {
    "JavaScript": [".js", ".mjs", ".cjs"],
    "TypeScript": [".ts", ".tsx"],
    "Python": [".py"],
    "Java": [".java"],
    "C#": [".cs"],
    "PHP": [".php"],
    "Go": [".go"],
    "Rust": [".rs"],
    "Ruby": [".rb"],
    "Shell": [".sh"],
    "HTML": [".html", ".htm"],
    "CSS": [".css", ".scss", ".sass", ".less"],
    "YAML": [".yml", ".yaml"],
    "JSON": [".json"],
    "Markdown": [".md"],
}

STRUCTURE_FOLDERS = {
    "src",
    "app",
    "pages",
    "api",
    "server",
    "client",
    "frontend",
    "backend",
    "public",
    "assets",
}

DEPLOYMENT_FILE_MAP: dict[str, str] = {
    "dockerfile": "docker",
    "docker-compose.yml": "docker-compose",
    "docker-compose.yaml": "docker-compose",
    "compose.yaml": "docker-compose",
    "compose.yml": "docker-compose",
    "render.yaml": "render",
    "render.yml": "render",
    "railway.json": "railway",
    "vercel.json": "vercel",
    "netlify.toml": "netlify",
    "fly.toml": "fly",
    "procfile": "heroku",
    "nginx.conf": "nginx",
    "caddyfile": "caddy",
}

LOCK_FILE_MANAGERS: dict[str, str] = {
    "package-lock.json": "npm",
    "npm-shrinkwrap.json": "npm",
    "yarn.lock": "yarn",
    "pnpm-lock.yaml": "pnpm",
    "bun.lockb": "bun",
    "bun.lock": "bun",
    "poetry.lock": "poetry",
    "uv.lock": "uv",
    "pipfile.lock": "pip",
    "cargo.lock": "cargo",
    "go.sum": "go",
    "composer.lock": "composer",
    "gemfile.lock": "bundler",
}
