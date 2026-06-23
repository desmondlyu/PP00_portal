from __future__ import annotations

try:
    from .app_main import main
except ImportError:  # 允許以腳本方式執行
    from app_main import main


if __name__ == "__main__":
    main()
