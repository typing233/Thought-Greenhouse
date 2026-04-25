import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'thought-greenhouse-secret-key'
    DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY')
    DEEPSEEK_API_URL = 'https://api.deepseek.com/v1/chat/completions'
    DATABASE_PATH = os.path.join(os.path.dirname(__file__), 'data', 'knowledge.db')
    STATIC_FOLDER = os.path.join(os.path.dirname(__file__), 'frontend', 'static')
    TEMPLATE_FOLDER = os.path.join(os.path.dirname(__file__), 'frontend', 'templates')
    CORS_ORIGINS = ['*']
    PORT = 8473
