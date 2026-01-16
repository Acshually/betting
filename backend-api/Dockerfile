# Use a lightweight Python image
FROM python:3.10-slim

WORKDIR /app

# Install FastAPI, Uvicorn (the server), and Redis
RUN pip install fastapi uvicorn redis websockets

# Copy the API code
COPY main.py .

# Start the FastAPI server on port 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
