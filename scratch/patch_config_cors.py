path = 'backend/app/config.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
    ]'''

replacement = '''    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://192.168.56.1:5173",
        "http://192.168.56.1:8000",
        "http://192.168.56.10:3000",
        "http://192.168.56.15:3000",
        "http://192.168.56.20:3000",
        "*"
    ]'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated config.py CORS_ORIGINS')
else:
    print('Target not found in config.py')
