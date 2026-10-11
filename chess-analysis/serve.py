#!/usr/bin/env python3
"""Local static server for the Chess Analysis app.

Stockfish 19's WebAssembly build uses threads (SharedArrayBuffer), which browsers
only enable on "cross-origin isolated" pages. That requires two HTTP headers that
file:// pages cannot have, so the app must be served over http://localhost.

Usage: python3 serve.py [--port 8719] [--no-browser]
"""
import argparse
import http.server
import os
import socket
import sys
import threading
import webbrowser

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        ".js": "text/javascript",
        ".mjs": "text/javascript",
        ".wasm": "application/wasm",
        ".json": "application/json",
        ".svg": "image/svg+xml",
        ".tsv": "text/tab-separated-values",
        ".nnue": "application/octet-stream",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        self.send_header("Cross-Origin-Opener-Policy", "same-origin")
        self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
        self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt, *args):
        if os.environ.get("CHESS_SERVER_VERBOSE"):
            super().log_message(fmt, *args)


def port_free(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(("127.0.0.1", port)) != 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--port", type=int, default=8719)
    ap.add_argument("--no-browser", action="store_true")
    args = ap.parse_args()

    port = args.port
    while not port_free(port):
        port += 1
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    httpd = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://localhost:{port}/index.html"
    print(f"Chess Analysis is running at {url}")
    print("Keep this window open while using the app. Press Ctrl+C to stop.")
    sys.stdout.flush()
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
