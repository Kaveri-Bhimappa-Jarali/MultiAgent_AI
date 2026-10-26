from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.report_service import generate_incident_pdf, generate_soc_summary_pdf

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.get("/incidents/{incident_id}/pdf")
def download_incident_report(incident_id: str, db: Session = Depends(get_db)):
    pdf_buffer = generate_incident_pdf(db, incident_id)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=Incident_{incident_id}_Dossier.pdf"}
    )

@router.get("/summary/pdf")
def download_summary_report(db: Session = Depends(get_db)):
    pdf_buffer = generate_soc_summary_pdf(db)
    return Response(
        content=pdf_buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=SOC_Executive_Summary_Report.pdf"}
    )
