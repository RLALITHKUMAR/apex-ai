"""
report.py — PDF report generation endpoint.
"""

import os
from flask import Blueprint, jsonify, send_file
from backend.database.models import get_inspection, log_audit
from backend.utils.pdf_generator import generate_report

report_bp = Blueprint("report", __name__)

REPORTS_FOLDER = os.getenv("REPORTS_FOLDER", "./reports")


@report_bp.route("/api/generate-report/<inspection_id>", methods=["GET"])
def generate(inspection_id: str):
    """
    GET /api/generate-report/:id
    Generates PDF and returns it as a downloadable file.
    """
    record = get_inspection(inspection_id)
    if not record:
        return jsonify({"error": "Inspection not found."}), 404

    try:
        report_path = generate_report(record)
        log_audit("generate_report", inspection_id, f"path={report_path}")
        return send_file(
            report_path,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"crack_report_{inspection_id}.pdf",
        )
    except Exception as e:
        return jsonify({"error": f"PDF generation failed: {str(e)}"}), 500
