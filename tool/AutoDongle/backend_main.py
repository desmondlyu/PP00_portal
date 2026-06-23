import shutil
import tempfile
from pathlib import Path
from typing import List
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse

# 載入原本的統計函數
from autolog_dongles.auto_summary import run_auto_summary

app = FastAPI(title="AutoDongle Summary API")

# 允許來自 GitHub Pages 或 localhost 的跨域請求
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 佈署時可更換為特定的 github.io 網址
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/api/summary")
async def api_summary(
    files: List[UploadFile] = File(...),
    cyc_type: int = Form(...)
):
    # 建立暫存資料夾放置 logs
    with tempfile.TemporaryDirectory() as temp_dir:
        temp_path = Path(temp_dir)
        
        # 將上傳的檔案儲存到暫存目錄下
        for file in files:
            # 確保檔名符合 *_log.txt 格式
            filename = file.filename
            if not filename.endswith("_log.txt"):
                filename = f"{Path(filename).stem}_log.txt"
            
            target_file = temp_path / filename
            with target_file.open("wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
                
        # 呼叫原始的統計核心
        try:
            result = run_auto_summary(temp_path, cyc_type)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Summary process error: {str(e)}")
            
        if "empty_log" in result.warnings or "no_data" in result.warnings:
            raise HTTPException(status_code=400, detail="Empty logs or no valid data found.")
            
        # 回傳生成的 Excel
        # 將 Excel 複製到獨立的暫存點，以避免 TemporaryDirectory 清除後無法下載
        output_temp = Path(tempfile.gettempdir()) / result.output_path.name
        shutil.copy(result.output_path, output_temp)
        
        return FileResponse(
            path=output_temp,
            filename=result.output_path.name,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend_main:app", host="127.0.0.1", port=8000, reload=True)
