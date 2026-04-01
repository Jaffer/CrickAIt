#!/bin/bash

echo "🏏 Booting up CrickAIt Multi-Agent Architecture..."

# 1. Start Redis Stack Database (Now with sudo)
echo "📦 Starting Redis Stack Container..."
sudo docker start redis-cricket 2>/dev/null || sudo docker run -d --name redis-cricket -p 6379:6379 redis/redis-stack-server:latest

# Wait 5 seconds to let Redis Stack fully boot up
echo "⏳ Waiting for database to initialize..."
sleep 5

# 2. Start the FastAPI Backend in the background
echo "⚙️ Starting FastAPI LangGraph Backend..."
uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!

# Wait 3 seconds to ensure the API is fully running
sleep 3

# 3. Start the Streamlit Frontend
echo "🎨 Starting Streamlit User Interface..."
streamlit run frontend.py

# 4. Cleanup Routine
trap "echo 'Shutting down backend...'; kill $BACKEND_PID; exit" INT TERM EXIT