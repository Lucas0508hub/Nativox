# Backend

Python FastAPI backend for the Nativox application.

## Structure

- `app/` - Main application code
- `alembic/` - Database migrations
- `requirements.txt` - Python dependencies
- `run.py` - Application runner
- `Dockerfile` - Container configuration

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run migrations
alembic upgrade head

# Start development server
python run.py
```

## API Documentation

When running, visit: http://localhost:5000/docs