#!/bin/bash
set -e

echo "=== Legal Knowledge Graph Engine Setup ==="

# Backend
echo "Setting up backend..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python -m spacy download en_core_web_sm
cd ..

# Frontend
echo "Setting up frontend..."
cd frontend
npm install
cd ..

echo ""
echo "=== Setup complete ==="
echo ""
echo "Start backend:  cd backend && source venv/bin/activate && uvicorn main:app --reload --port 8001"
echo "Start frontend: cd frontend && npm run dev"
echo "Open:           http://localhost:5174"
