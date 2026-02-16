import os
from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware
import mysql.connector
from cachetools import cached, TTLCache
from contextlib import contextmanager
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

CACHE = TTLCache(maxsize=1000, ttl=300)

@contextmanager
def get_connection():
  conn = mysql.connector.connect(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "gps_user"),
    password=os.getenv("DB_PASSWORD"),
    database="GPS_Database"
  )
  try:
    yield conn
  finally:
    conn.close()

@cached(cache=CACHE)
def fetch_data(query: str, id: int = None) -> list[dict[str, any]]:
  with get_connection() as conn:
    with conn.cursor(dictionary=True) as cursor:
      if id is not None:
        cursor.execute(query, (id,))
      else:
        cursor.execute(query)
      
      rows = cursor.fetchall()

      if not rows:
        key = (query, id)
        if key in CACHE:
          del CACHE[key]
        raise HTTPException(status_code=404, detail="No data found")
      
      return rows

# --- Proxy / Forwarded headers (equivalent to ProxyFix) ---
app.add_middleware(
  TrustedHostMiddleware,
  allowed_hosts=["*"]
)

# --- CORS configuration ---
app.add_middleware(
  CORSMiddleware,
  allow_origins=["*"],
  allow_credentials=True,
  allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allow_headers=["Content-Type", "Authorization"],
)

# --- Static files ---
app.mount("/static", StaticFiles(directory="static"), name="static")

# --- Templates ---
templates = Jinja2Templates(directory="templates")

@app.get("/", response_class=HTMLResponse)
def index(request: Request):
  return templates.TemplateResponse(
    "index.html",
    {"request": request}
  )

@app.get("/api/v2/gps/{tourID}")
def get_tour(tourID: int):
  try:
    tour = fetch_data(
      "SELECT * FROM gps_tracking WHERE tourID = %s",
      tourID
    )
    return tour
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v2/gps")
def get_tours():
  try:
    tours = fetch_data(
      "SELECT * FROM gps_tracking"
    )
    return tours
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/v2/gps/pos/{posID}")
def get_pos(posID: int):
  try:
    pos = fetch_data(
      "SELECT * FROM gps_tracking WHERE posID = %s",
      posID
    )
    return pos
  except Exception as e:
    raise HTTPException(status_code=500, detail=str(e))
    
@app.get("/api/v2/gps/pos")
def reroute_pos():
  return RedirectResponse("/gps/pos/1514")

@app.get("/api/v2/health")
def health():
  try:
    test = fetch_data("SELECT 1 as healthy")
    return {
      "status": 'healthy',
      "db": 'connected'
    }
  except Exception as e:
    return {
      "status": 'unhealthy',
      "db": 'disconnected',
      "error": f'{e}'
    }