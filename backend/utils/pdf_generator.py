"""
pdf_generator.py — PDF inspection report using ReportLab.
"""

import os
import io
from datetime import datetime
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, Image as RLImage
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

REPORTS_FOLDER = os.getenv("REPORTS_FOLDER", "./reports")

SEVERITY_COLORS = {
    "No Crack":  colors.HexColor("#00c864"),
    "Minor":     colors.HexColor("#ffd600"),
    "Moderate":  colors.HexColor("#ff7800"),
    "Severe":    colors.HexColor("#e53935"),
}


def generate_report(inspection: dict, report_path: str = None) -> str:
    """
    Generate a PDF report for an inspection record.

    Args:
        inspection: dict from DB (all fields)
        report_path: optional custom output path

    Returns:
        Absolute path to the generated PDF
    """
    os.makedirs(REPORTS_FOLDER, exist_ok=True)
    if report_path is None:
        report_path = os.path.join(REPORTS_FOLDER, f"report_{inspection['id']}.pdf")

    doc = SimpleDocTemplate(
        report_path, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm, bottomMargin=2*cm,
    )

    styles  = getSampleStyleSheet()
    story   = []
    sev     = inspection.get("severity", "No Crack")
    sev_col = SEVERITY_COLORS.get(sev, colors.grey)

    # ── Title ────────────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "title", fontSize=20, alignment=TA_CENTER,
        textColor=colors.HexColor("#1a1a2e"), spaceAfter=4,
        fontName="Helvetica-Bold",
    )
    story.append(Paragraph("AI Crack Detection Report", title_style))
    story.append(Paragraph("Structural Health Monitoring System", ParagraphStyle(
        "sub", fontSize=11, alignment=TA_CENTER,
        textColor=colors.HexColor("#666666"), spaceAfter=6,
    )))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1a1a2e")))
    story.append(Spacer(1, 0.4*cm))

    # ── Inspection Meta ───────────────────────────────────────────────────────
    ts = inspection.get("timestamp", datetime.now().isoformat())
    meta_data = [
        ["Inspection ID", inspection.get("id", "N/A")],
        ["Date & Time",   ts],
        ["Source",        inspection.get("source", "upload").capitalize()],
        ["Location",      inspection.get("location_tag") or "Not specified"],
    ]
    meta_table = Table(meta_data, colWidths=[5*cm, 12*cm])
    meta_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (0, -1), colors.HexColor("#f0f0f0")),
        ("FONTNAME",    (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, colors.HexColor("#f9f9f9")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#dddddd")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING",(0, 0), (-1, -1), 8),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Severity Badge ────────────────────────────────────────────────────────
    sev_style = ParagraphStyle(
        "sev", fontSize=16, alignment=TA_CENTER,
        textColor=colors.white, fontName="Helvetica-Bold",
        backColor=sev_col, borderPadding=8, borderRadius=4,
    )
    badge_label = f"Severity: {sev}  |  Confidence: {inspection.get('confidence', 0):.1f}%  |  Crack Area: {inspection.get('crack_area_pct', 0):.1f}%"
    story.append(Paragraph(badge_label, sev_style))
    story.append(Spacer(1, 0.5*cm))

    # ── Images ────────────────────────────────────────────────────────────────
    original_path  = inspection.get("original_path", "")
    annotated_path = inspection.get("annotated_path", "")

    img_row = []
    for img_path, caption in [(original_path, "Original Image"), (annotated_path, "Analyzed Image")]:
        if img_path and Path(img_path).exists():
            img_obj = RLImage(img_path, width=7.5*cm, height=7.5*cm, kind="proportional")
            cap_para = Paragraph(caption, ParagraphStyle("cap", fontSize=9, alignment=TA_CENTER))
            img_row.append([img_obj, cap_para])

    if img_row:
        img_data = [[item[0] for item in img_row], [item[1] for item in img_row]]
        img_table = Table(img_data, colWidths=[8.5*cm] * len(img_row))
        img_table.setStyle(TableStyle([
            ("ALIGN",  (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        story.append(img_table)
        story.append(Spacer(1, 0.5*cm))

    # ── Analysis Results ──────────────────────────────────────────────────────
    story.append(Paragraph("Analysis Results", ParagraphStyle(
        "h2", fontSize=13, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1a1a2e"), spaceAfter=6,
    )))

    results_data = [
        ["Parameter",       "Value"],
        ["Crack Detected",  "Yes" if inspection.get("crack_detected") else "No"],
        ["Severity Level",  sev],
        ["Confidence Score",f"{inspection.get('confidence', 0):.1f}%"],
        ["Crack Area",      f"{inspection.get('crack_area_pct', 0):.2f}% of image"],
    ]
    results_table = Table(results_data, colWidths=[7*cm, 10*cm])
    results_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), colors.HexColor("#1a1a2e")),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.HexColor("#cccccc")),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING",  (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING",(0, 0), (-1, -1), 6),
    ]))
    story.append(results_table)
    story.append(Spacer(1, 0.5*cm))

    # ── Recommendation ────────────────────────────────────────────────────────
    story.append(Paragraph("Recommendation", ParagraphStyle(
        "h2", fontSize=13, fontName="Helvetica-Bold",
        textColor=colors.HexColor("#1a1a2e"), spaceAfter=6,
    )))
    story.append(Paragraph(
        inspection.get("recommendation", "No recommendation available."),
        ParagraphStyle("rec", fontSize=10, textColor=colors.HexColor("#333333"),
                       leading=16, leftIndent=10)
    ))
    story.append(Spacer(1, 0.8*cm))

    # ── Footer ────────────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#cccccc")))
    story.append(Paragraph(
        f"Generated by AI Crack Detection System  ·  {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        ParagraphStyle("footer", fontSize=8, alignment=TA_CENTER,
                       textColor=colors.HexColor("#999999"), spaceBefore=6)
    ))

    doc.build(story)
    return os.path.abspath(report_path)
