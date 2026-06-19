# StockWise - Inventory & Order Management System

[![Publish Docker Image](https://github.com/Rajat0098/Inventory_management_System/actions/workflows/docker-publish.yml/badge.svg)](https://github.com/Rajat0098/Inventory_management_System/actions/workflows/docker-publish.yml)

StockWise is a simplified Inventory & Order Management System built with a **FastAPI** backend API, a **React** (Vite + TypeScript + Vanilla CSS) frontend, and a **PostgreSQL** database. 

The application implements advanced inventory control rules, database row locking for race-condition prevention, responsive dashboard views, and full containerization.

---

## Technical Stack & Architecture

- **Backend**: Python 3.14 + FastAPI. Uses SQLAlchemy 2.0 ORM with a PostgreSQL connection engine. Supports automatic fallback to local SQLite database when PostgreSQL is offline.
- **Frontend**: React 18 + Vite + TypeScript + Vanilla CSS. Built using custom glassmorphic styling, HSL colors, responsive grid columns, custom alerts, scrollbars, and Lucide SVG icons.
- **Database**: PostgreSQL (Dockerized) or local SQLite (`inventory.db`) for lightweight development.
- **Containerization**: Multi-service Docker Compose.

---

## Implemented Business Rules

1. **Unique SKUs**: Product SKUs are indexed with a `unique` constraint at the database tier. Attempting to save a duplicate SKU returns a clean `400 Bad Request`.
2. **Unique Customer Emails**: Customer contact records enforce email uniqueness.
3. **Transactional Inventory Deductions**: Placing a sales order queries and locks the associated product rows using SQLAlchemy's `.with_for_update()` lock. This prevents concurrent read/write race conditions.
4. **Out-of-Stock Preventions**: If a user attempts to order more items than are currently available in the warehouse stock, the transaction is immediately rolled back and an HTTP 400 is returned.
5. **Stock Recovery on Cancellation**: Changing an order status to `'cancelled'` automatically calculates the line quantities and restores them back to the active product stock levels inside an atomic database transaction.

---

## Local Setup & Quick Start (Windows)

A custom launcher batch script is included in the project root to start everything with one click.

### Method A: Single-click Launch (Recommended)
1. Double-click the `run-local.bat` script in the root directory.
2. This script will automatically:
   - Run `npm install` to download frontend dependencies.
   - Boot the FastAPI backend on `http://localhost:8000` (auto-routing to SQLite since Docker is off).
   - Boot the React dev server on `http://localhost:5173`.
3. Open your browser and navigate to `http://localhost:5173`.

### Method B: Manual Startup

#### 1. Start the Backend API
```bash
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000 --reload
```
The API Swagger Docs will be available at: `http://localhost:8000/docs`.

#### 2. Start the React Frontend
```bash
cd frontend
npm install
npm run dev
```
The User Interface will be available at: `http://localhost:5173`.

---

## Running Automated Tests

We have written an integration test suite verifying email/SKU uniqueness, stock reductions, and order status updates. Run them directly in the backend folder:
```bash
cd backend
venv\Scripts\pytest
```

---

## Containerization with Docker

If Docker Desktop is running on your machine, launch the entire containerized network (Postgres DB + Backend API + Frontend Client) using:
```bash
docker compose up -d --build
```
This maps:
- React App: `http://localhost:5173`
- FastAPI: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## Public Deployment Guide

Since hosting platform accounts and Docker Hub require personal authentication, follow these steps to deploy and obtain your hosted links:

### 1. Push to GitHub
1. Create a new empty repository on GitHub named `inventory-order-system`.
2. Run these commands in the project root:
   ```bash
   git init
   git add .
   git commit -m "Initial commit of StockWise inventory system"
   git branch -M main
   git remote add origin https://github.com/Rajat0098/Inventory_management_System.git
   git push -u origin main
   ```

### 2. Publish Docker Hub Image
To compile and publish your backend API image to Docker Hub:
```bash
# Build the image locally
docker build -t pri0070/stockwise-backend:latest ./backend

# Login to Docker Hub
docker login

# Push the image to the repository
docker push pri0070/stockwise-backend:latest
```
This gives you your **Backend Docker Hub Image Link**: `https://hub.docker.com/r/pri0070/stockwise-backend`.

### 3. Deploy to Render (Free Tier)
Render supports automatic deployments using our pre-configured `render.yaml` Blueprint file:
1. Log in to [Render](https://render.com).
2. Go to your Dashboard -> click **New** -> Select **Blueprint**.
3. Connect your GitHub repository.
4. Render will automatically parse the `render.yaml` file and spin up:
   - A PostgreSQL Database
   - A FastAPI Web Service (**Backend API Hosted URL**)
   - A Static Web Service (**Frontend Hosted URL**)
5. Note down the deployed URLs provided by Render!
