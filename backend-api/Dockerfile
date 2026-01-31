FROM python:3.10-slim
WORKDIR /app
# Explicitly installing a newer redis version
RUN pip install fastapi uvicorn redis>=4.5.0 websockets
COPY main.py .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]