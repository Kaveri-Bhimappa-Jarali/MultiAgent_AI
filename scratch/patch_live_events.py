path = 'soc-frontend/src/hooks/useLiveEvents.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

target = """    status: e.detection_status === 'ANALYZED' ? 'Correlated' : 'New',
    correlationId: e.correlation_id || (e.severity === 'CRITICAL' || e.severity === 'HIGH' ? 'INC-2026-001' : null),"""

replacement = """    status: e.correlation_id ? 'Correlated' : (e.detection_status === 'ANALYZED' ? 'Analyzed' : 'New'),
    correlationId: e.correlation_id || null,"""

if target in content:
    content = content.replace(target, replacement, 1)
    with open(path, 'w', encoding='utf-8', newline='') as f:
        f.write(content)
    print('Updated useLiveEvents.js')
else:
    print('Target not found in useLiveEvents.js')
