from __future__ import annotations

import sys
from pathlib import Path

# 確保套件路徑可被匯入
CURRENT_DIR = Path(__file__).parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

from autolog_dongles.app_main import main  # noqa: E402


if __name__ == "__main__":
    main()
