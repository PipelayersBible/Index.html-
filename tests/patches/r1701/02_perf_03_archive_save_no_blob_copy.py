import sys
src, out = sys.argv[1], sys.argv[2]
s = open(src, encoding='utf-8').read()
def rep(old, new, n=1):
    global s
    assert s.count(old) == n, (s.count(old), old[:90])
    s = s.replace(old, new)
# perf audit 03 (Nov 17, on r16.97) [medium-high once Records holds photos: every save, i.e. every laid mark, note,
# Lock, End]: saveRunArchive measured the size of the Records text with `new Blob([json]).size`, which copies the whole
# text (70 MB with 200 photos) into a second buffer on the main thread, only to word a message. In a CPU profile of one
# laid mark that copy was the largest single cost (Blob ~420 ms of ~1 s at desktop speed). Fix: the size comes from
# the text's length (photos are base64 = 1 byte per character; other text is a rounding error at these sizes) and is
# only used for the same two messages. Same for the Stats save.
rep("""      const json = JSON.stringify(runArchive);
      const sizeMB = new Blob([json]).size / (1024*1024);""",
"""      const json = JSON.stringify(runArchive);
      const sizeMB = json.length / (1024*1024); // perf audit 03: no second copy of the whole text just to word a message""")
rep("""    const json = JSON.stringify(statsLog);
    const sizeMB = new Blob([json]).size / (1024*1024);""",
"""    const json = JSON.stringify(statsLog);
    const sizeMB = json.length / (1024*1024); // perf audit 03""")
open(out, 'w', encoding='utf-8').write(s)
