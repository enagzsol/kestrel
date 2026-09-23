#!/usr/bin/env python3
"""Dev server: like `python3 -m http.server 8765` but tells browsers never to cache,
so the iPhone Home Screen app always picks up the latest files."""
import http.server, socketserver, sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

class Handler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), Handler) as httpd:
    print(f"Serving on http://0.0.0.0:{PORT}", flush=True)
    httpd.serve_forever()
