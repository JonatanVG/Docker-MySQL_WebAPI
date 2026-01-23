# fastapi/Dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app.py .
COPY templates ./templates
COPY static ./static

# Create non-root user
RUN adduser --disabled-password --gecos '' fastapi

# Change ownership of the application files
RUN chown -R fastapi:fastapi /app

# Switch to non-root user
USER fastapi

# Expose port
EXPOSE 5000

# Run the application
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "5000", "--proxy-headers", "--forwarded-allow-ips", "*"]
# CMD ["gunicorn", "-w", "4", "-k", "gthread", "-b", "0.0.0.0:5000", "app:app"]