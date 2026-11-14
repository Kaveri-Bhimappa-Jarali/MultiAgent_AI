import re

# 1. Update backend/app/main.py
with open("backend/app/main.py", "r", encoding="utf-8") as f:
    main_code = f.read()

if "allow_origin_regex" not in main_code:
    main_code = main_code.replace(
        'allow_origins=settings.CORS_ORIGINS,',
        'allow_origins=settings.CORS_ORIGINS,\n    allow_origin_regex=r"^https?://.*",'
    )
    with open("backend/app/main.py", "w", encoding="utf-8") as f:
        f.write(main_code)
    print("Updated main.py with allow_origin_regex")

# 2. Update backend/app/services/response_service.py
with open("backend/app/services/response_service.py", "r", encoding="utf-8") as f:
    resp_code = f.read()

if "from app.config import settings" not in resp_code:
    resp_code = "from app.config import settings\n" + resp_code

resp_code = resp_code.replace(
    'command_to_run = "iptables -I INPUT -i lo -j ACCEPT; iptables -I INPUT -s 192.168.56.1 -j ACCEPT; iptables -P INPUT DROP; iptables -P FORWARD DROP"',
    'command_to_run = f"iptables -I INPUT -i lo -j ACCEPT; iptables -I INPUT -s {settings.SOC_HOST_IP} -j ACCEPT; iptables -P INPUT DROP; iptables -P FORWARD DROP"'
)
with open("backend/app/services/response_service.py", "w", encoding="utf-8") as f:
    f.write(resp_code)
print("Updated response_service.py with dynamic SOC_HOST_IP")

# 3. Update backend/app/api/virtual_lab.py
with open("backend/app/api/virtual_lab.py", "r", encoding="utf-8") as f:
    vl_code = f.read()

if "from app.config import settings" not in vl_code:
    vl_code = "from app.config import settings\n" + vl_code

vl_code = vl_code.replace(
    '"iptables -I INPUT -s 192.168.56.1 -j ACCEPT; "',
    'f"iptables -I INPUT -s {settings.SOC_HOST_IP} -j ACCEPT; "'
)

# Add node registration endpoint if not present
if "/nodes/register" not in vl_code:
    node_register_snippet = '''
@router.post("/nodes/register")
def register_or_update_node(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Allows registering or updating a VM node's IP address, role, and API key.
    Enables plug-and-play compatibility with any custom subnet.
    """
    vm_id = payload.get("vm_id")
    if not vm_id:
        raise HTTPException(status_code=400, detail="vm_id is required")
    
    node = db.query(VMNode).filter(VMNode.vm_id == vm_id).first()
    if not node:
        node = VMNode(
            vm_id=vm_id,
            name=payload.get("name", f"Lab Node ({vm_id})"),
            role=payload.get("role", "SERVER"),
            ip_address=payload.get("ip_address", "192.168.56.15"),
            os_info=payload.get("os_info", "Linux 64-bit"),
            status="CONFIGURED",
            active_collectors=payload.get("active_collectors", ["auth_log", "socket_monitor"]),
            api_key=payload.get("api_key", f"VM-KEY-{vm_id.upper()}-2026"),
            created_at=datetime.now(timezone.utc)
        )
        db.add(node)
    else:
        if payload.get("ip_address"):
            node.ip_address = payload["ip_address"]
        if payload.get("role"):
            node.role = payload["role"]
        if payload.get("api_key"):
            node.api_key = payload["api_key"]
        if payload.get("name"):
            node.name = payload["name"]
        if payload.get("status"):
            node.status = payload["status"]
            
    db.commit()
    db.refresh(node)
    return {
        "status": "REGISTERED",
        "node": {
            "vm_id": node.vm_id,
            "name": node.name,
            "role": node.role,
            "ip_address": node.ip_address,
            "api_key": node.api_key,
            "status": node.status
        }
    }
'''
    vl_code = vl_code + node_register_snippet
    with open("backend/app/api/virtual_lab.py", "w", encoding="utf-8") as f:
        f.write(vl_code)
    print("Updated virtual_lab.py with dynamic SOC_HOST_IP and /nodes/register endpoint")
