#!/usr/bin/env bash
# =============================================================
# TO-DO Automate — First-time bootstrap script
# Run this from the repo root: bash setup.sh
# =============================================================

echo "==> Setting up backend virtual environment..."
cd backend
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo "✅ Backend dependencies installed."

echo ""
echo "==> Copying backend .env template..."
cp .env.example .env
echo "⚠️  Edit backend/.env with your real credentials before starting."

deactivate
cd ..

echo ""
echo "==> Frontend is already installed (npm install already ran)."
echo ""
echo "==> Copying frontend .env template..."
cp frontend/.env.example frontend/.env

echo ""
echo "🎉 Setup complete! See HOW_TO_RUN.md to start the servers."
