path = 'backend/app/services/detection_service.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''        flow_features = extract_flow_features_from_event(evt)
        if flow_features and len(flow_features) > 0:
            ml_res = run_realtime_flow_inference(flow_features)'''

replacement = '''        flow_features = extract_flow_features_from_event(evt)
        # Require genuine multi-attribute flow metrics and non-INFO severity to prevent false positives on benign web traffic
        if flow_features and len(flow_features) >= 3 and evt.severity != "INFO":
            ml_res = run_realtime_flow_inference(flow_features)'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated detection_service.py')
else:
    print('Target not found in detection_service.py')
