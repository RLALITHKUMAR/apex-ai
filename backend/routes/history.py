"""
history.py — Inspection history and statistics endpoints.
"""

from flask import Blueprint, jsonify, request
from backend.database.models import (
    get_all_inspections, get_inspection,
    delete_inspection, get_statistics, log_audit
)

history_bp = Blueprint("history", __name__)


@history_bp.route("/api/inspection-history", methods=["GET"])
def get_history():
    """GET /api/inspection-history?limit=50&offset=0"""
    limit  = int(request.args.get("limit",  50))
    offset = int(request.args.get("offset", 0))
    rows   = get_all_inspections(limit=limit, offset=offset)
    return jsonify({"inspections": rows, "count": len(rows)}), 200


@history_bp.route("/api/inspection/<inspection_id>", methods=["GET"])
def get_single(inspection_id: str):
    """GET /api/inspection/:id"""
    record = get_inspection(inspection_id)
    if not record:
        return jsonify({"error": "Inspection not found."}), 404
    return jsonify(record), 200


@history_bp.route("/api/inspection/<inspection_id>", methods=["DELETE"])
def delete_single(inspection_id: str):
    """DELETE /api/inspection/:id"""
    deleted = delete_inspection(inspection_id)
    if not deleted:
        return jsonify({"error": "Inspection not found."}), 404
    log_audit("delete_inspection", inspection_id)
    return jsonify({"message": "Inspection deleted.", "id": inspection_id}), 200


@history_bp.route("/api/statistics", methods=["GET"])
def get_stats():
    """GET /api/statistics — dashboard aggregate stats."""
    stats = get_statistics()
    return jsonify(stats), 200
