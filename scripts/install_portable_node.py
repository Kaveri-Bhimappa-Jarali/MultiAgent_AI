"""
Download and configure portable Node.js LTS (v20.18.0) for Windows AMD64.
Extracts to local tools directory and tests node and npm.
"""

import os
import sys
import shutil
import zipfile
import subprocess
import urllib.request

NODE_VERSION = "v20.18.0"
NODE_ZIP_NAME = f"node-{NODE_VERSION}-win-x64.zip"
NODE_URL = f"https://nodejs.org/dist/{NODE_VERSION}/{NODE_ZIP_NAME}"

TARGET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".tools", "node"))
ZIP_CACHE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "wheels"))

def install_portable_node():
    os.makedirs(ZIP_CACHE_DIR, exist_ok=True)
    zip_path = os.path.join(ZIP_CACHE_DIR, NODE_ZIP_NAME)

    if not os.path.exists(zip_path) or os.path.getsize(zip_path) < 10000000:
        print(f"[NODE] Downloading portable Node.js {NODE_VERSION} from {NODE_URL}...")
        # Use curl.exe if available for speed and resume support
        curl_cmd = ["curl.exe", "-L", "--retry", "5", "-C", "-", "-o", zip_path, NODE_URL]
        try:
            subprocess.run(curl_cmd, check=True)
        except Exception as e:
            print(f"[NODE] curl.exe failed ({e}), falling back to urllib...")
            urllib.request.urlretrieve(NODE_URL, zip_path)

    print(f"[NODE] Downloaded {os.path.getsize(zip_path)} bytes to {zip_path}")

    # Extract to TARGET_DIR
    extracted_folder_name = f"node-{NODE_VERSION}-win-x64"
    temp_extract = os.path.join(ZIP_CACHE_DIR, "node_extract_tmp")
    os.makedirs(temp_extract, exist_ok=True)

    print(f"[NODE] Extracting archive...")
    with zipfile.ZipFile(zip_path, 'r') as zip_ref:
        zip_ref.extractall(temp_extract)

    source_dir = os.path.join(temp_extract, extracted_folder_name)
    if os.path.exists(TARGET_DIR):
        try:
            shutil.rmtree(TARGET_DIR)
        except Exception:
            pass
    os.makedirs(os.path.dirname(TARGET_DIR), exist_ok=True)
    shutil.move(source_dir, TARGET_DIR)
    shutil.rmtree(temp_extract, ignore_errors=True)

    print(f"[NODE] Node.js successfully installed at: {TARGET_DIR}")

    node_exe = os.path.join(TARGET_DIR, "node.exe")
    npm_cmd = os.path.join(TARGET_DIR, "npm.cmd")

    if os.path.exists(node_exe):
        node_v = subprocess.check_output([node_exe, "--version"], text=True).strip()
        npm_v = subprocess.check_output([npm_cmd, "--version"], text=True).strip()
        print(f"[NODE] SUCCESS: Node {node_v}, npm {npm_v}")
        return True
    else:
        print(f"[NODE] ERROR: node.exe not found at {node_exe}")
        return False

if __name__ == "__main__":
    success = install_portable_node()
    sys.exit(0 if success else 1)
