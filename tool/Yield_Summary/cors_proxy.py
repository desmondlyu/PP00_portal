import http.server
import urllib.request
import urllib.error

class CORSProxyHandler(http.server.BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_GET(self):
        self.proxy_request("GET")

    def do_POST(self):
        self.proxy_request("POST")

    def send_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')

    def proxy_request(self, method):
        # 目標內網 API 位址
        target_host = "http://report"
        target_url = target_host + self.path
        
        # 讀取請求的 Body (如果有的話)
        content_length = int(self.headers.get('Content-Length', 0))
        data = self.rfile.read(content_length) if content_length > 0 else None

        # 複製前端傳來的 Headers
        headers = {}
        for key, value in self.headers.items():
            if key.lower() not in ['host', 'content-length']:
                headers[key] = value

        req = urllib.request.Request(target_url, data=data, headers=headers, method=method)
        
        try:
            with urllib.request.urlopen(req) as response:
                self.send_response(response.status)
                self.send_cors_headers()
                for key, value in response.getheaders():
                    if key.lower() not in ['content-length', 'transfer-encoding', 'connection']:
                        self.send_header(key, value)
                self.end_headers()
                self.wfile.write(response.read())
        except urllib.error.HTTPError as e:
            self.send_response(e.code)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(e.read())
        except Exception as e:
            self.send_response(500)
            self.send_cors_headers()
            self.end_headers()
            self.wfile.write(str(e).encode('utf-8'))

def run(port=8780):
    server_address = ('', port)
    httpd = http.server.HTTPServer(server_address, CORSProxyHandler)
    print(f"==================================================")
    print(f" PP00 CORS Proxy Server is running on Port {port}")
    print(f" Forwarding requests to: http://report")
    print(f" Press Ctrl+C to stop the server")
    print(f"==================================================")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping proxy server...")

if __name__ == '__main__':
    run()
