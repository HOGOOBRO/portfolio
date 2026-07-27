import re, sys
def dual(ko, en): return '<span class="ko">%s</span><span class="en">%s</span>' % (ko, en)
def apply(path, repl, ready=True):
    s=open(path).read(); miss=[]
    for ko, en in repl:
        if ko in s: s=s.replace(ko, dual(ko, en), 1)
        else: miss.append(ko[:70])
    if ready:
        s=s.replace('<body class="theme-paper lang-ko">','<body class="theme-paper lang-ko i18n-ready">')
    open(path,'w').write(s)
    body=s[s.index('</head>'):]
    body=re.sub(r'<span class="ko">.*?</span>\s*<span class="en">.*?</span>','',body,flags=re.S)
    left=[re.sub(r'\s+',' ',m.group(1)).strip() for m in re.finditer(r'>([^<>]+)<', body) if re.search(r'[가-힣]', m.group(1))]
    print('%-24s 적용 %d/%d · 남은 한글 %d' % (path, len(repl)-len(miss), len(repl), len(left)))
    for m in miss: print('   미적용:', m)
    for t in left[:14]: print('   남음:', t[:80])
