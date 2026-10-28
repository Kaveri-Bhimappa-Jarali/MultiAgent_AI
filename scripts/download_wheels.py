import os
import sys
import json
import urllib.request
import urllib.error
import time

WHEELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "wheels"))
os.makedirs(WHEELS_DIR, exist_ok=True)

PACKAGES = ["numpy", "pandas", "scikit-learn"]

def get_wheel_url(pkg_name: str) -> str:
    url = f"https://pypi.org/pypi/{pkg_name}/json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    urls = data.get("urls", [])
    # Find matching wheel for cp314 win_amd64
    for u in urls:
        fn = u.get("filename", "")
        if "cp314" in fn and "win_amd64" in fn and fn.endswith(".whl"):
            return u.get("url"), fn
            
    # Try finding any cp314 or py3-none-any
    for u in urls:
        fn = u.get("filename", "")
        if ("cp314" in fn or "py3-none-any" in fn) and fn.endswith(".whl"):
            return u.get("url"), fn
            
    raise RuntimeError(f"No suitable cp314 wheel found for {pkg_name}")

def download_file(url: str, filename: str):
    target_path = os.path.join(WHEELS_DIR, filename)
    if os.path.exists(target_path) and os.path.getsize(target_path) > 100000:
        print(f"Already exists: {filename} ({os.path.getsize(target_path)} bytes)")
        return target_path

    print(f"Downloading {filename} from {url}...")
    headers = {"User-Agent": "Mozilla/5.0"}
    
    max_retries = 5
    for attempt in range(max_retries):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=60) as response, open(target_path + ".tmp", "wb") as out_file:
                total_size = int(response.headers.get("Content-Length", 0))
                downloaded = 0
                chunk_size = 65536
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    out_file.write(chunk)
                    downloaded += len(chunk)
                    if total_size > 0:
                        pct = (downloaded / total_size) * 100
                        print(f"\r  Downloaded {downloaded}/{total_size} bytes ({pct:.1f}%)", end="", flush=True)
                    else:
                        print(f"\r  Downloaded {downloaded} bytes", end="", flush=True)
            print()
            if os.path.exists(target_path):
                os.remove(target_path)
            os.rename(target_path + ".tmp", target_path)
            print(f"Saved: {target_path} ({os.path.getsize(target_path)} bytes)")
            return target_path
        except Exception as e:
            print(f"\n  [Retry {attempt+1}/{max_retries}] Error: {e}")
            time.sleep(2)
            
    raise RuntimeError(f"Failed to download {filename} after {max_retries} attempts")

def main():
    print("=" * 60)
    print("Fetching prebuilt binary wheels for Python 3.14 on Windows")
    print("=" * 60)
    for pkg in PACKAGES:
        try:
            url, fn = get_wheel_url(pkg)
            print(f"\n[+] {pkg} -> {fn}")
            download_file(url, fn)
        except Exception as e:
            print(f"[-] Failed for {pkg}: {e}")

if __name__ == "__main__":
    main()
