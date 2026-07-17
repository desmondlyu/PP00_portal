"""
Yield Summary - Local CORS Proxy
=================================
讓 GitHub Pages (HTTPS) 能透過本機 localhost 存取公司內網 API。
純 Python 標準庫，零依賴，雙擊即用。

使用方式：
  1. 雙擊 proxy.bat（或命令列執行 python proxy.py）
  2. 開啟 GitHub Pages 上的 Yield Summary 工具
  3. 工具會自動偵測並透過 localhost:8780 代理 API 請求
  4. 用完關掉此視窗即可
"""

import http.server
import urllib.request
import urllib.error
import json
import sys

PROXY_PORT = 8780
TARGET_BASE = "http://report"


class ProxyServer(http.server.ThreadingHTTPServer):
    daemon_threads = True


class ProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        """處理 CORS preflight"""
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        """轉發 GET 請求到內網 API"""
        target_url = f"{TARGET_BASE}{self.path}"
        try:
            req = urllib.request.Request(target_url)
            # 轉發原始請求的 headers（僅保留必要的）
            for key in ('wectoken', 'wecToken'):
                val = self.headers.get(key)
                if val:
                    req.add_header('wecToken', val)

            with urllib.request.urlopen(req, timeout=60) as resp:
                body = resp.read()
                self.send_response(resp.status)
                self._set_cors_headers()
                self.send_header('Content-Type', resp.headers.get('Content-Type', 'application/json'))
                self.end_headers()
                self.wfile.write(body)
        except urllib.error.HTTPError as e:
            try:
                self.send_response(e.code)
                self._set_cors_headers()
                self.end_headers()
                self.wfile.write(e.read())
            except (ConnectionAbortedError, BrokenPipeError):
                pass  # ponytail: client already disconnected, nothing to do
        except (ConnectionAbortedError, BrokenPipeError, ConnectionResetError):
            pass  # ponytail: client already disconnected, nothing to do
        except Exception as e:
            print(f"  [PROXY] ERROR: {e}")
            try:
                self.send_response(502)
                self._set_cors_headers()
                self.send_header('Content-Type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode())
            except (ConnectionAbortedError, BrokenPipeError):
                pass  # ponytail: client already disconnected, nothing to do

    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'wecToken, Content-Type')

    def log_message(self, format, *args):
        print(f"  [PROXY] {args[0]}")


if __name__ == '__main__':
    print("=" * 56)
    print("  Yield Summary - Local CORS Proxy")
    print("=" * 56)
    print(f"  Proxy:  http://localhost:{PROXY_PORT}")
    print(f"  Target: {TARGET_BASE}")
    print(f"  狀態:   就緒，等待 GitHub Pages 連線...")
    print("-" * 56)
    print("  ✓ 開啟 GitHub Pages 的 Yield Summary 即可使用")
    print("  ✓ 關閉此視窗即停止代理")
    print("=" * 56)

    server = ProxyServer(('127.0.0.1', PROXY_PORT), ProxyHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Proxy 已停止。")
        server.server_close()
