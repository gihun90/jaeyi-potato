# 앱 서버. 아이패드 사파리가 옛 파일을 기억해서 고친 화면이 안 보이는 일을 막으려고
# 모든 파일에 "매번 바뀌었는지 확인하기"(no-cache) 표시를 붙여 보냄.
# 실행: python morning-app/serve.py   → 같은 와이파이에서 http://<PC IP>:5180
import functools
import http.server
import os
import sys


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-cache')
        super().end_headers()


port = int(sys.argv[1]) if len(sys.argv) > 1 else 5180
here = os.path.dirname(os.path.abspath(__file__))
print(f'http://localhost:{port}  (Ctrl+C로 끄기)')
http.server.ThreadingHTTPServer(('0.0.0.0', port), functools.partial(NoCache, directory=here)).serve_forever()
