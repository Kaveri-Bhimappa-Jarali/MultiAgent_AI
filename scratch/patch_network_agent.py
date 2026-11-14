path = 'backend/app/agents/network_agent.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''            # Supervised ML Flow Inference on flow attributes
            flow_feats = extract_flow_features_from_event(e)
            if flow_feats and len(flow_feats) > 0:
                ml_res = run_realtime_flow_inference(flow_feats)
                if ml_res.get("ml_evaluated") and ml_res.get("is_malicious") and ml_res.get("attack_probability", 0) >= 0.60:
                    ml_detections.append((e, ml_res))'''

replacement = '''            # Supervised ML Flow Inference on flow attributes
            flow_feats = extract_flow_features_from_event(e)
            if flow_feats and len(flow_feats) >= 3 and e.severity != "INFO":
                ml_res = run_realtime_flow_inference(flow_feats)
                if ml_res.get("ml_evaluated") and ml_res.get("is_malicious") and ml_res.get("attack_probability", 0) >= 0.60:
                    ml_detections.append((e, ml_res))'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated network_agent.py')
else:
    print('Target not found in network_agent.py')
