import json

path = r'C:\Users\kaver\.gemini\antigravity\brain\9383f497-e4e6-49a9-93d3-9c80c05add91\.system_generated\logs\transcript_full.jsonl'
with open(path, 'r', encoding='utf-8') as f:
    for line in f:
        if '"step_index":806' in line or '"step_index": 806' in line:
            obj = json.loads(line)
            with open('scratch/prompt5.txt', 'w', encoding='utf-8') as out:
                out.write(obj.get('content', ''))
            print("Wrote prompt to scratch/prompt5.txt. Length:", len(obj.get('content', '')))
            break
