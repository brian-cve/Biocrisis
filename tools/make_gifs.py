"""Une los fotogramas de tools/capture-gifs.mjs en GIF optimizados. Uso: python3 tools/make_gifs.py <frames> <salida>"""
import sys
from pathlib import Path
from PIL import Image

src, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
for d in sorted(p for p in src.iterdir() if p.is_dir()):
    files = sorted(d.glob('*.jpg'))
    ms = max(40, int((d / 'ms.txt').read_text()))
    frames = [Image.open(f).convert('RGB').resize((512, 320), Image.LANCZOS) for f in files]
    pal = frames[len(frames) // 2].quantize(colors=96, method=Image.Quantize.MEDIANCUT)
    q = [f.quantize(palette=pal, dither=Image.Dither.NONE) for f in frames]
    q[0].save(out / f'{d.name}.gif', save_all=True, append_images=q[1:], duration=ms, loop=0, optimize=True, disposal=1)
    print(d.name, len(frames), 'fotogramas', ms, 'ms ->', round((out / f'{d.name}.gif').stat().st_size / 1024), 'KB')
