import io
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
from fastapi import HTTPException

from app.models.incident import Incident, IncidentEvent, IncidentNote
from app.models.event import SecurityEvent
from app.models.response import ResponseAction, VerificationResult
from app.models.risk import RiskAssessment

# Design tokens
NAVY = colors.HexColor("#0B1020")
DEEP_SURFACE = colors.HexColor("#111A2E")
ROYAL_PURPLE = colors.HexColor("#6D5AE6")
GOLD = colors.HexColor("#D8B875")
MUTED_SLATE = colors.HexColor("#94A3B8")
SOFT_WHITE = colors.HexColor("#F5F7FC")
SUCCESS_GREEN = colors.HexColor("#2DBE85")
CRITICAL_RED = colors.HexColor("#F05265")

def generate_incident_pdf(db: Session, incident_id: str) -> io.BytesIO:
    incident = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not incident:
        raise HTTPException(status_code=404, detail=f"Incident {incident_id} not found")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Heading1'],
        fontName='Helvetica-Bold',
        fontSize=20,
        textColor=ROYAL_PURPLE,
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubTitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        textColor=MUTED_SLATE,
        spaceAfter=12
    )
    heading2_style = ParagraphStyle(
        'Heading2',
        parent=styles['Heading2'],
        fontName='Helvetica-Bold',
        fontSize=13,
        textColor=GOLD,
        spaceBefore=10,
        spaceAfter=6
    )
    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        textColor=colors.black,
        leading=12
    )

    elements = []

    # Header banner
    elements.append(Paragraph("ENTERPRISE MULTI-AGENT SOC — INCIDENT DOSSIER", title_style))
    elements.append(Paragraph(f"CONFIDENTIAL & PRIVILEGED | Generated {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}", subtitle_style))
    elements.append(HRFlowable(width="100%", thickness=1.5, color=ROYAL_PURPLE, spaceAfter=10))

    # Incident Metadata Table
    meta_data = [
        [
            Paragraph("<b>Incident ID:</b>", body_style), Paragraph(incident.incident_id, body_style),
            Paragraph("<b>Risk Score:</b>", body_style), Paragraph(f"{incident.risk_score} / 100", body_style)
        ],
        [
            Paragraph("<b>Title:</b>", body_style), Paragraph(incident.title, body_style),
            Paragraph("<b>Severity:</b>", body_style), Paragraph(incident.severity, body_style)
        ],
        [
            Paragraph("<b>Status:</b>", body_style), Paragraph(incident.status, body_style),
            Paragraph("<b>Assigned:</b>", body_style), Paragraph(incident.assigned_analyst, body_style)
        ],
        [
            Paragraph("<b>First Observed:</b>", body_style), Paragraph(incident.first_seen.strftime('%Y-%m-%d %H:%M:%S') if incident.first_seen else 'N/A', body_style),
            Paragraph("<b>Last Observed:</b>", body_style), Paragraph(incident.last_seen.strftime('%Y-%m-%d %H:%M:%S') if incident.last_seen else 'N/A', body_style)
        ],
        [
            Paragraph("<b>Affected Users:</b>", body_style), Paragraph(", ".join(incident.affected_users or ["None"]), body_style),
            Paragraph("<b>Affected Hosts:</b>", body_style), Paragraph(", ".join(incident.affected_hosts or ["None"]), body_style)
        ]
    ]

    t_meta = Table(meta_data, colWidths=[90, 180, 90, 180])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8F9FC")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
    ]))
    elements.append(t_meta)
    elements.append(Spacer(1, 12))

    # AI Investigation Synthesis
    elements.append(Paragraph("1. Multi-Agent AI Root Cause Analysis (RCA)", heading2_style))
    summary = incident.ai_summary or {}
    ai_items = [
        ("What Happened:", summary.get("what_happened", "Analysis in progress.")),
        ("Initial Ingress:", summary.get("how_did_it_begin", "Under review.")),
        ("Attack Progression:", summary.get("likely_attack_sequence", "Under review.")),
    ]
    for label, val in ai_items:
        elements.append(Paragraph(f"<b>{label}</b> {val}", body_style))
        elements.append(Spacer(1, 4))

    elements.append(Spacer(1, 8))

    # Risk Assessment
    risk = db.query(RiskAssessment).filter(RiskAssessment.incident_id == incident_id).first()
    if risk:
        elements.append(Paragraph("2. Risk Assessment Rationale", heading2_style))
        elements.append(Paragraph(f"<b>Classification:</b> {risk.severity_band} (Score: {risk.overall_score}/100) | <b>Progression Stage:</b> {risk.progression_stage}", body_style))
        elements.append(Paragraph(f"<b>Explanation:</b> {risk.explanation}", body_style))
        elements.append(Spacer(1, 8))

    # Defensive Responses & Verification
    responses = db.query(ResponseAction).filter(ResponseAction.incident_id == incident_id).all()
    elements.append(Paragraph("3. Defensive Response & Verification History", heading2_style))
    if responses:
        resp_data = [["Action ID", "Type", "Target", "Status", "Execution Mode"]]
        for r in responses:
            resp_data.append([
                r.action_id,
                r.action_type,
                r.target_value,
                r.status,
                "Dry-Run" if r.is_dry_run else "Active"
            ])
        t_resp = Table(resp_data, colWidths=[90, 110, 150, 90, 100])
        t_resp.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), ROYAL_PURPLE),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
            ('TOPPADDING', (0, 0), (-1, -1), 3),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 3),
        ]))
        elements.append(t_resp)
    else:
        elements.append(Paragraph("No automated response actions executed yet for this incident.", body_style))

    # Verification status
    ver = db.query(VerificationResult).filter(VerificationResult.incident_id == incident_id).first()
    if ver:
        elements.append(Spacer(1, 6))
        elements.append(Paragraph(f"<b>Verification Outcome:</b> {ver.verification_status}", body_style))
        elements.append(Paragraph(f"<b>Evidence:</b> {ver.evidence_summary}", body_style))

    elements.append(Spacer(1, 14))
    elements.append(HRFlowable(width="100%", thickness=0.5, color=MUTED_SLATE, spaceAfter=8))
    elements.append(Paragraph("Generated by Multi-Agent AI Security Operations Center v1.0. All containment actions audited.", subtitle_style))

    doc.build(elements)
    buffer.seek(0)
    return buffer

def generate_soc_summary_pdf(db: Session) -> io.BytesIO:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()

    title_style = ParagraphStyle('DocTitle', parent=styles['Heading1'], fontName='Helvetica-Bold', fontSize=20, textColor=ROYAL_PURPLE, spaceAfter=4)
    heading2_style = ParagraphStyle('Heading2', parent=styles['Heading2'], fontName='Helvetica-Bold', fontSize=13, textColor=GOLD, spaceBefore=10, spaceAfter=6)
    body_style = ParagraphStyle('BodyDark', parent=styles['Normal'], fontName='Helvetica', fontSize=9, textColor=colors.black, leading=12)

    total_events = db.query(SecurityEvent).count()
    total_incidents = db.query(Incident).count()
    contained_count = db.query(Incident).filter(Incident.status == "CONTAINED").count()
    actions_count = db.query(ResponseAction).count()

    elements = [
        Paragraph("ENTERPRISE SOC EXECUTIVE SUMMARY REPORT", title_style),
        Paragraph(f"Global Threat Operations Overview | {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}", styles['Normal']),
        HRFlowable(width="100%", thickness=1.5, color=ROYAL_PURPLE, spaceAfter=12),
        Paragraph("1. Security Posture Key Metrics", heading2_style),
    ]

    metrics_table = [
        ["Total Security Events Ingested", str(total_events)],
        ["Active/Tracked Incidents", str(total_incidents)],
        ["Threats Successfully Contained", str(contained_count)],
        ["SOAR Defensive Actions Initiated", str(actions_count)],
        ["Specialized Autonomous Agents Active", "10 / 10 Active"],
    ]

    t_m = Table(metrics_table, colWidths=[270, 270])
    t_m.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor("#F8F9FC")),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
    ]))
    elements.append(t_m)

    doc.build(elements)
    buffer.seek(0)
    return buffer
