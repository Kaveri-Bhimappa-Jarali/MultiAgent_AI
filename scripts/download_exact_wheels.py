import os
import sys
import json
import subprocess
import urllib.request

WHEELS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "wheels"))
os.makedirs(WHEELS_DIR, exist_ok=True)

PACKAGES = [
    "scipy",
    "joblib",
    "threadpoolctl",
    "python-dateutil",
    "tzdata",
    "narwhals"
]

def get_wheel_info(pkg_name: str):
    url = f"https://pypi.org/pypi/{pkg_name}/json"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    
    urls = data.get("urls", [])
    # 1. First look for cp314-cp314-win_amd64.whl
    for u in urls:
        fn = u.get("filename", "")
        if "cp314-cp314-win_amd64.whl" in fn:
            return u.get("url"), fn
            
    # 2. Look for py3-none-any.whl or py2.py3-none-any.whl
    for u in urls:
        fn = u.get("filename", "")
        if "none-any.whl" in fn:
            return u.get("url"), fn

    # 3. Look for any cp314 win_amd64
    for u in urls:
        fn = u.get("filename", "")
        if "win_amd64.whl" in fn and "cp314t" not in fn:
            return u.get("url"), fn
            
    raise RuntimeError(f"Could not find compatible wheel for {pkg_name}")

def main():
    for pkg in PACKAGES:
        try:
            url, fn = get_wheel_info(pkg)
            out_path = os.path.join(WHEELS_DIR, fn)
            if os.path.exists(out_path) and os.path.getsize(out_path) > 1000:
                print(f"[+] Already downloaded {pkg}: {fn}")
                continue

            print(f"[+] Found {pkg}: {fn}")
            print(f"    URL: {url}")
            print(f"    Downloading via curl with auto-resume...")
            cmd = [
                "curl.exe", "-L",
                "--retry", "10",
                "--retry-delay", "2",
                "--retry-max-time", "300",
                "-C", "-",
                "-o", out_path,
                url
            ]
            res = subprocess.run(cmd, check=True)
            size = os.path.getsize(out_path)
            print(f"    [SUCCESS] Saved {fn} ({size} bytes)\n")
        except Exception as e:
            print(f"[-] Failed for {pkg}: {e}\n")

if __name__ == "__main__":
    main()
