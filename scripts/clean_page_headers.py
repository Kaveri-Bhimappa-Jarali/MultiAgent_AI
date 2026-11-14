# scripts/clean_page_headers.py
import re
import os

pages_dir = r"c:\Users\kaver\MultiAgent_AI\frontend\src\pages"

for root, _, files in os.walk(pages_dir):
    for f in files:
        if not f.endswith(".tsx"):
            continue
        filepath = os.path.join(root, f)
        with open(filepath, "r", encoding="utf-8") as file:
            content = file.read()
        
        # Remove workflowStep={{ ... }}
        content = re.sub(r'\s*workflowStep=\{\{[\s\S]*?\}\}', '', content)
        # Remove terms={[ ... ]}
        content = re.sub(r'\s*terms=\{[\s\S]*?\}', '', content)
        
        with open(filepath, "w", encoding="utf-8") as file:
            file.write(content)
        print(f"Cleaned {f}")

print("All page headers cleaned!")
