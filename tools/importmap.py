# index.html의 importmap을 js 폴더의 모든 파일로 다시 쓴다 (파일을 더하거나 지우면 실행)
import os, json, re
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = sorted(os.path.relpath(os.path.join(dp, f), root).replace(os.sep, '/') for dp, _, fs in os.walk(os.path.join(root, 'js')) for f in fs if f.endswith('.js'))
imports = {"three": "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js", "three/addons/": "https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/"}
for f in files: imports['./' + f] = './' + f + '?v=__V__'
p = os.path.join(root, 'index.html'); s = open(p, encoding='utf-8').read()
s = re.sub(r'<script type="importmap">.*?</script>', '<script type="importmap">' + json.dumps({"imports": imports}, ensure_ascii=False) + '</script>', s, flags=re.S)
open(p, 'w', encoding='utf-8').write(s); print(len(files), 'files')
