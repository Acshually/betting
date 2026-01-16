# Use a lightweight Python image
FROM python:3.10-slim

# Set the working directory inside the container
WORKDIR /app

# Install the redis library
RUN pip install redis

# Copy your scripts into the container
COPY engine.py .
COPY matching_logic.py .

# Run the engine
CMD ["python", "engine.py"]
