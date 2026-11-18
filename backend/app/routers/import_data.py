import io
import csv
import json
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from app.schemas.all_schemas import CSVImportPreviewRequest, CSVColumnMapping, CSVImportResult, CSVRowIssue
from app.db.repositories import get_repo, get_audit_repo
from app.deps import get_current_user

router = APIRouter(prefix="/import", tags=["Data Import"])

@router.post("/file-upload")
async def upload_file_for_preview(
    dataset_type: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    """
    Accepts direct file upload (CSV, JSON), decodes text and generates preview.
    """
    contents = await file.read()
    try:
        text = contents.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = contents.decode("latin-1")

    return parse_csv_preview(dataset_type, text, filename=file.filename or "upload.csv")

@router.post("/preview")
def preview_csv_text(req: CSVImportPreviewRequest, current_user: dict = Depends(get_current_user)):
    return parse_csv_preview(req.dataset_type, req.file_content, filename=req.filename)

def parse_csv_preview(dataset_type: str, raw_text: str, filename: str = "data.csv") -> Dict[str, Any]:
    lines = [line for line in raw_text.splitlines() if line.strip()]
    if not lines:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    reader = csv.reader(lines)
    header = next(reader, None)
    if not header:
        raise HTTPException(status_code=400, detail="CSV header row missing.")

    headers = [h.strip() for h in header]
    raw_rows = []
    for row in reader:
        if not any(row):
            continue
        row_dict = {}
        for idx, col in enumerate(headers):
            row_dict[col] = row[idx].strip() if idx < len(row) else ""
        raw_rows.append(row_dict)

    # Standard suggested mappings
    suggested_mapping: Dict[str, str] = {}
    lower_headers = {h.lower(): h for h in headers}

    if dataset_type == "case_reports":
        targets = ["day", "reported_cases", "reported_deaths", "hospital_admissions"]
        synonyms = {
            "day": ["day", "date", "time", "step"],
            "reported_cases": ["cases", "reported_cases", "new_cases", "incidence", "positive"],
            "reported_deaths": ["deaths", "reported_deaths", "mortality"],
            "hospital_admissions": ["hospital", "admissions", "hosp", "beds"]
        }
        for t in targets:
            for syn in synonyms[t]:
                if syn in lower_headers:
                    suggested_mapping[t] = lower_headers[syn]
                    break

    elif dataset_type == "populations":
        targets = ["name", "count", "initial_immunity", "hospitalisation_rate", "ifr"]
        synonyms = {
            "name": ["age_group", "group", "name", "bracket"],
            "count": ["count", "population", "n", "total"],
            "initial_immunity": ["immunity", "initial_immunity", "immune"],
            "hospitalisation_rate": ["hospitalisation_rate", "hosp_rate", "hospital"],
            "ifr": ["ifr", "fatality", "death_rate"]
        }
        for t in targets:
            for syn in synonyms[t]:
                if syn in lower_headers:
                    suggested_mapping[t] = lower_headers[syn]
                    break

    return {
        "dataset_type": dataset_type,
        "filename": filename,
        "headers": headers,
        "total_rows": len(raw_rows),
        "suggested_mapping": suggested_mapping,
        "preview_rows": raw_rows[:15]
    }

@router.post("/commit", response_model=CSVImportResult)
def commit_imported_data(payload: CSVColumnMapping, current_user: dict = Depends(get_current_user)):
    """
    Validates mapped columns row by row, records issue table, commits valid rows to MongoDB.
    """
    dataset_type = payload.dataset_type
    mapping = payload.column_mapping
    rows = payload.raw_data
    issues: List[CSVRowIssue] = []
    valid_items: List[Dict[str, Any]] = []

    if dataset_type == "case_reports":
        day_col = mapping.get("day")
        cases_col = mapping.get("reported_cases")
        deaths_col = mapping.get("reported_deaths")
        hosp_col = mapping.get("hospital_admissions")

        seen_days = set()
        for idx, row in enumerate(rows):
            row_num = idx + 1
            # Check day
            raw_day = row.get(day_col, "")
            try:
                day_val = int(float(raw_day))
                if day_val < 0:
                    issues.append(CSVRowIssue(row_number=row_num, field="day", error="Day must be non-negative", raw_value=raw_day))
                    continue
            except (ValueError, TypeError):
                issues.append(CSVRowIssue(row_number=row_num, field="day", error="Invalid numeric value for day", raw_value=raw_day))
                continue

            # Check cases
            raw_cases = row.get(cases_col, "")
            try:
                cases_val = int(float(raw_cases))
                if cases_val < 0:
                    issues.append(CSVRowIssue(row_number=row_num, field="reported_cases", error="Cases cannot be negative", raw_value=raw_cases))
                    continue
            except (ValueError, TypeError):
                issues.append(CSVRowIssue(row_number=row_num, field="reported_cases", error="Invalid numeric value for cases", raw_value=raw_cases))
                continue

            # Optional deaths and hosp
            deaths_val = 0
            if deaths_col and row.get(deaths_col):
                try:
                    deaths_val = int(float(row.get(deaths_col)))
                except ValueError:
                    deaths_val = 0

            hosp_val = 0
            if hosp_col and row.get(hosp_col):
                try:
                    hosp_val = int(float(row.get(hosp_col)))
                except ValueError:
                    hosp_val = 0

            valid_items.append({
                "day": day_val,
                "reported_cases": cases_val,
                "reported_deaths": deaths_val,
                "hospital_admissions": hosp_val
            })

        # Save to case_reports collection
        if valid_items:
            # Sort by day
            valid_items.sort(key=lambda x: x["day"])
            repo = get_repo("case_reports")
            doc = repo.create({
                "name": f"Imported Case Reports ({len(valid_items)} days)",
                "owner_id": current_user["id"],
                "data": valid_items,
                "total_cases": sum(x["reported_cases"] for x in valid_items)
            })
            get_audit_repo().log("IMPORT_COMMIT", "case_reports", doc["id"], user_id=current_user["id"], details={"valid": len(valid_items), "issues": len(issues)})
            return CSVImportResult(
                success=True,
                total_rows=len(rows),
                valid_rows=len(valid_items),
                invalid_rows=len(issues),
                issues=issues,
                committed_id=doc["id"],
                preview_data=valid_items[:10]
            )

    elif dataset_type == "populations":
        name_col = mapping.get("name")
        count_col = mapping.get("count")

        age_groups = []
        total_N = 0
        for idx, row in enumerate(rows):
            row_num = idx + 1
            ag_name = row.get(name_col, f"Group_{row_num}")
            raw_count = row.get(count_col, "0")
            try:
                count_val = int(float(raw_count))
                if count_val < 0:
                    issues.append(CSVRowIssue(row_number=row_num, field="count", error="Count must be non-negative", raw_value=raw_count))
                    continue
            except (ValueError, TypeError):
                issues.append(CSVRowIssue(row_number=row_num, field="count", error="Invalid numeric count", raw_value=raw_count))
                continue

            imm = float(row.get(mapping.get("initial_immunity", ""), 0.0) or 0.0)
            hosp_rate = float(row.get(mapping.get("hospitalisation_rate", ""), 0.02) or 0.02)
            ifr = float(row.get(mapping.get("ifr", ""), 0.005) or 0.005)

            age_groups.append({
                "name": ag_name,
                "count": count_val,
                "initial_immunity": min(1.0, max(0.0, imm)),
                "hospitalisation_rate": min(1.0, max(0.0, hosp_rate)),
                "ifr": min(1.0, max(0.0, ifr))
            })
            total_N += count_val

        if age_groups:
            doc = get_repo("populations").create({
                "name": f"Imported Population ({len(age_groups)} groups)",
                "total_population": total_N,
                "hospital_beds": max(50, int(total_N * 0.003)),
                "icu_beds": max(10, int(total_N * 0.0006)),
                "age_groups": age_groups,
                "owner_id": current_user["id"],
                "is_shared": False
            })
            get_audit_repo().log("IMPORT_COMMIT", "populations", doc["id"], user_id=current_user["id"])
            return CSVImportResult(
                success=True,
                total_rows=len(rows),
                valid_rows=len(age_groups),
                invalid_rows=len(issues),
                issues=issues,
                committed_id=doc["id"],
                preview_data=age_groups
            )

    return CSVImportResult(
        success=False,
        total_rows=len(rows),
        valid_rows=0,
        invalid_rows=len(rows),
        issues=issues or [CSVRowIssue(row_number=1, field="general", error="Unsupported dataset type or no valid rows parsed.", raw_value=None)],
        committed_id=None
    )
