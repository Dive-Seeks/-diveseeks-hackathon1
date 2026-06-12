FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY dive_specialist_agent ./dive_specialist_agent
ENV PORT=8080
CMD ["sh", "-c", "uvicorn dive_specialist_agent.server:app --host 0.0.0.0 --port ${PORT}"]
