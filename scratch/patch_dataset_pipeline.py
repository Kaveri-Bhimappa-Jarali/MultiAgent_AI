path = 'backend/app/services/dataset_pipeline.py'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = '''    # 3. If event_type is network_connection and flow attributes are present, return dictionary
    if getattr(event, "event_type", None) == "network_connection" or len(flow_data) >= 3:
        return flow_data

    return flow_data if len(flow_data) > 0 else None'''

replacement = '''    # 3. Flow inference requires actual multi-dimensional flow metrics (e.g. sbytes, dbytes, dur, rate)
    # A standalone destination_port without flow metrics must not trigger flow classifier
    flow_metric_keys = {"sbytes", "dbytes", "dur", "rate", "spkts", "dpkts", "sttl", "dttl", "sload", "dload"}
    has_flow_metrics = any(k in flow_data for k in flow_metric_keys)

    if has_flow_metrics or len(flow_data) >= 4:
        return flow_data

    return None'''

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated dataset_pipeline.py')
else:
    print('Target not found in dataset_pipeline.py')
