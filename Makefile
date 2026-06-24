.PHONY: dev backend frontend mobile migrate test lint docker-up docker-down clean help

help:
	@echo "DEO STUDIO CRM — Команды разработки"
	@echo "-----------------------------------"
	@echo "make dev         — Запустить всё для разработки"
	@echo "make backend     — Запустить backend сервер"
	@echo "make frontend    — Запустить frontend сервер"
	@echo "make mobile      — Запустить Flutter приложение"
	@echo "make migrate     — Применить миграции БД"
	@echo "make test        — Запустить все тесты"
	@echo "make lint        — Проверить код линтером"
	@echo "make docker-up   — Поднять инфраструктуру (DB, Redis, S3)"
	@echo "make docker-down — Остановить инфраструктуру"
	@echo "make clean       — Очистить кэш и сборки"

# Инфраструктура
docker-up:
	docker compose up -d

docker-down:
	docker compose down

docker-logs:
	docker compose logs -f

# Backend
backend-install:
	cd backend && python -m venv .venv && \
	. .venv/bin/activate && \
	pip install -r requirements/dev.txt

backend-migrate:
	cd backend && . .venv/bin/activate && python manage.py migrate

backend:
	cd backend && . .venv/bin/activate && python manage.py runserver

backend-shell:
	cd backend && . .venv/bin/activate && python manage.py shell

backend-test:
	cd backend && . .venv/bin/activate && pytest

backend-lint:
	cd backend && . .venv/bin/activate && flake8 apps/
	cd backend && . .venv/bin/activate && black --check apps/

# Frontend
frontend-install:
	cd frontend && npm install

frontend:
	cd frontend && npm run dev

frontend-build:
	cd frontend && npm run build

frontend-test:
	cd frontend && npm run test

frontend-lint:
	cd frontend && npm run lint

frontend-typecheck:
	cd frontend && npx tsc --noEmit

# Mobile
mobile-install:
	cd mobile && flutter pub get

mobile:
	cd mobile && flutter run

mobile-test:
	cd mobile && flutter test

mobile-analyze:
	cd mobile && flutter analyze

# Общие команды
dev: docker-up backend frontend

migrate: backend-migrate

test: backend-test frontend-test mobile-test

lint: backend-lint frontend-lint mobile-analyze

install: backend-install frontend-install mobile-install

clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".next" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "build" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".venv" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "node_modules" -exec rm -rf {} + 2>/dev/null || true
	rm -rf docker/volumes/ 2>/dev/null || true
