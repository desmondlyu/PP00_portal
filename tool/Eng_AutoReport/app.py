from __future__ import annotations

import json
import os
import io
import threading
import shutil
import sys
import uuid
from pathlib import Path
from typing import Any

from flask import Flask, Response, jsonify, request, send_file, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

APP_DIR = Path(__file__).resolve().parent
REPO_ROOT = APP_DIR
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

os.chdir(REPO_ROOT)

import cp_summary_report as cpr  # noqa: E402
import gen_eng_report as ger  # noqa: E402

class WebRedirector(io.TextIOBase):
    def __init__(self, log_file_handle):
        self.file = log_file_handle
    def write(self, text):
        if not self.file.closed:
            self.file.write(text)
            self.file.flush()
        return len(text)
    def flush(self):
        if not self.file.closed:
            self.file.flush()


DEFAULT_STATIONS = ["DS00", "S1P1", "DS05", "SFIN", "DS03", "SPRE"]
RUNTIME_DIR = Path(os.environ.get("RUNTIME_DIR", APP_DIR / "runtime"))
GENERATION_LOCK = threading.Lock()

app = Flask(__name__, static_folder=str(APP_DIR), static_url_path="")
CORS(app)


def _json_form(name: str, default: Any) -> Any:
    raw = request.form.get(name)
    if not raw:
        return default
    return json.loads(raw)


def _runtime_dir() -> Path:
    run_id = uuid.uuid4().hex
    path = RUNTIME_DIR / run_id
    path.mkdir(parents=True, exist_ok=True)
    return path


def _save_upload(file_storage, target_dir: Path, filename: str) -> Path:
    target = target_dir / secure_filename(filename)
    file_storage.save(target)
    return target


def _write_status(status_path: Path, data: dict) -> None:
    tmp_path = status_path.with_suffix(".tmp")
    with open(tmp_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False)
    os.replace(tmp_path, status_path)



def _prepare_report_inputs(run_dir: Path) -> tuple[Path, Path, Path]:
    excel = request.files.get("excel")
    pdf = request.files.get("pdf")
    if excel is None:
        raise ValueError("缺少 CP Summary Excel")
    if pdf is None:
        raise ValueError("缺少 Datasheet PDF")

    excel_path = _save_upload(excel, run_dir, excel.filename or "cp_summary.xlsx")
    pdf_path = _save_upload(pdf, run_dir, pdf.filename or "datasheet.pdf")
    cover = request.files.get("cover")
    cover_path = REPO_ROOT / "封面.docx"
    if cover is not None and cover.filename:
        cover_path = _save_upload(cover, run_dir, cover.filename)
    return excel_path, pdf_path, cover_path


@app.get("/")
def index() -> Response:
    return send_from_directory(APP_DIR, "index.html")


@app.get("/api/health")
def health() -> Response:
    return jsonify(
        {
            "ok": True,
            "service": "eng-autoreport",
            "api_base": request.host_url.rstrip("/"),
        }
    )


@app.get("/api/config")
def config() -> Response:
    return jsonify(
        {
            "apiBase": os.environ.get("API_BASE_URL", request.host_url.rstrip("/")),
            "frontendOrigin": os.environ.get("FRONTEND_ORIGIN", ""),
            "runtimeDir": str(RUNTIME_DIR),
            "renderExternalUrl": os.environ.get("RENDER_EXTERNAL_URL", ""),
            "stations": DEFAULT_STATIONS,
            "hasCoverTemplate": (REPO_ROOT / "封面.docx").exists(),
        }
    )


@app.post("/api/reports/generate")
def generate_report() -> Response:
    run_id = uuid.uuid4().hex
    run_dir = RUNTIME_DIR / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    
    try:
        excel_path, pdf_path, cover_path = _prepare_report_inputs(run_dir)
    except Exception as exc:
        return jsonify({"ok": False, "error": str(exc)}), 400

    # 處理 CZ Corner Excel 上傳
    cz_excel = request.files.get("czExcel")
    cz_path = ""
    if cz_excel and cz_excel.filename:
        cz_path = _save_upload(cz_excel, run_dir, "cz_summary.xlsx")

    # 提取表單參數並儲存，防範 Flask Request 銷毀後無法存取
    product_no = (request.form.get("productNo", "") or "").strip() or "FAG102B"
    product_func = (request.form.get("productFunc", "") or "").strip()
    manager = (request.form.get("manager", "") or "").strip()
    author = (request.form.get("author", "") or "").strip()
    mask_versions = _json_form("maskVersions", [])
    lots = _json_form("lots", [])
    stations = _json_form("stations", DEFAULT_STATIONS)

    charts_dir = run_dir / "charts"
    charts_dir.mkdir(parents=True, exist_ok=True)
    output_docx = run_dir / f"{product_no}_工程報告.docx"

    params = {
        "productNo": product_no,
        "productFunc": product_func,
        "manager": manager,
        "author": author,
        "maskVersions": mask_versions,
        "lots": lots,
        "stations": stations
    }
    with open(run_dir / "params.json", "w", encoding="utf-8") as f:
        json.dump(params, f, ensure_ascii=False)

    # 儲存 status.json 初始狀態
    status_path = run_dir / "status.json"
    _write_status(status_path, {"status": "running", "logs": "", "error": None})

    # 背景執行 pipeline
    def run_pipeline():
        with GENERATION_LOCK:
            # ponytail: python-docx + lxml 內部遞迴深度需求較高
            sys.setrecursionlimit(10000)
            log_path = run_dir / "run.log"
            status_path = run_dir / "status.json"
            
            old_stdout = sys.stdout
            old_stderr = sys.stderr
            
            with open(log_path, "w", encoding="utf-8") as log_file:
                redirector = WebRedirector(log_file)
                sys.stdout = redirector
                sys.stderr = redirector
                try:
                    # Step 1: CP Summary
                    print("【Step 1 / 3】產 CP Summary 圖表 …")
                    cpr.PRODUCT_NO = product_no
                    cpr.WORKBOOK   = str(excel_path)
                    cpr.OUTPUT_DIR = str(charts_dir)
                    cpr.STATIONS   = stations
                    charts_map = cpr.build_all()
                    
                    # Step 2: CZ Corner
                    cz_out_dir = charts_dir / "cz"
                    if cz_path:
                        print("【Step 2 / 3】產 CZ Corner 特性統計圖 …")
                        import cz_corner_table as czt
                        czt.run(files=[str(cz_path)], out_dir=str(cz_out_dir))
                        ger.CZ_IMAGES_DIR = str(cz_out_dir)
                    else:
                        print("【Step 2 / 3】無 CZ Corner 資料，跳過。")
                        ger.CZ_IMAGES_DIR = ""

                    # Step 3: Word Generate
                    print("【Step 3 / 3】產工程報告 Word 檔 …")
                    ger.PRODUCT_NO    = product_no
                    ger.PRODUCT_FUNC  = product_func
                    ger.MANAGER       = manager
                    ger.AUTHOR        = author
                    ger.DATASHEET_PDF = str(pdf_path)
                    ger.WORKBOOK      = str(excel_path)
                    ger.OUTPUT_DOCX   = str(output_docx)
                    ger.MASK_VERSIONS = [(m.get("ver", ""), m.get("desc", ""), bool(m.get("isCurrent"))) for m in mask_versions]
                    ger.LOTS          = [
                        (lot.get("fab", ""), lot.get("lotNo", ""), lot.get("maskVer", ""),
                         lot.get("route", ""), lot.get("wat", ""), lot.get("cp1", ""))
                        for lot in lots
                    ]
                    ger.STATIONS      = stations
                    ger.CHARTS_MAP    = charts_map
                    ger.COVER_FILE    = str(cover_path)
                    ger.CHARTS_DIR    = str(charts_dir)
                    ger.build_report()

                    print("【完成】報告產生成功！")
                    _write_status(status_path, {"status": "completed", "error": None})
                except Exception as e:
                    import traceback
                    print(f"\n【錯誤】執行失敗：{e}")
                    print(traceback.format_exc())
                    _write_status(status_path, {"status": "failed", "error": str(e)})
                finally:
                    sys.stdout = old_stdout
                    sys.stderr = old_stderr

    threading.Thread(target=run_pipeline, daemon=True).start()
    return jsonify({"ok": True, "runId": run_id})


@app.get("/api/reports/status/<run_id>")
def report_status(run_id: str) -> Response:
    if not run_id.isalnum():
        return jsonify({"ok": False, "error": "Invalid run_id format"}), 400
    run_dir = RUNTIME_DIR / run_id
    status_path = run_dir / "status.json"
    log_path = run_dir / "run.log"
    
    if not status_path.exists():
        return jsonify({"ok": False, "error": "Invalid run_id"}), 404
    
    with open(status_path, "r", encoding="utf-8") as f:
        status_data = json.load(f)
    
    logs = ""
    if log_path.exists():
        with open(log_path, "r", encoding="utf-8") as f:
            logs = f.read()
            
    # 搜集產出的圖片
    charts_dir = run_dir / "charts"
    charts = []
    if charts_dir.exists():
        for f in charts_dir.iterdir():
            if f.suffix.lower() == '.png':
                charts.append({
                    "name": f.name,
                    "url": f"/api/files/{run_id}/charts/{f.name}"
                })

    return jsonify({
        "status": status_data.get("status"),
        "logs": logs,
        "error": status_data.get("error"),
        "docxUrl": f"/api/files/{run_id}/docx",
        "charts": charts
    })


@app.get("/api/files/<run_id>/charts/<filename>")
def download_chart(run_id: str, filename: str) -> Response:
    if not run_id.isalnum():
        return jsonify({"ok": False, "error": "Invalid run_id format"}), 400
    return send_from_directory(str(RUNTIME_DIR / run_id / "charts"), filename)


@app.get("/api/files/<run_id>/docx")
def download_docx(run_id: str) -> Response:
    if not run_id.isalnum():
        return jsonify({"ok": False, "error": "Invalid run_id format"}), 400
    run_dir = RUNTIME_DIR / run_id
    docx_files = list(run_dir.glob("*_工程報告.docx"))
    if not docx_files:
        return jsonify({"ok": False, "error": "Word file not ready"}), 404
    return send_file(
        docx_files[0],
        as_attachment=True,
        download_name=docx_files[0].name,
        mimetype="application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    )


@app.get("/api/files/<path:filename>")
def download_runtime_file(filename: str) -> Response:
    return send_from_directory(str(RUNTIME_DIR), filename, as_attachment=True)


@app.errorhandler(404)
def not_found(_exc: Exception) -> Response:
    if request.path.startswith("/api/"):
        return jsonify({"ok": False, "error": "not found"}), 404
    return send_from_directory(APP_DIR, "index.html")


def _cleanup_runtime() -> None:
    if not RUNTIME_DIR.exists():
        return
    for child in RUNTIME_DIR.iterdir():
        if child.is_dir():
            shutil.rmtree(child, ignore_errors=True)
        else:
            try:
                child.unlink()
            except OSError:
                pass


if __name__ == "__main__":
    RUNTIME_DIR.mkdir(parents=True, exist_ok=True)
    _cleanup_runtime()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "5000")), debug=True)
