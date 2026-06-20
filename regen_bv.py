from pathlib import Path
import prep_bv
src = Path("/home/veesion/hexagonal/data/01_raw/datagouv/bureaux-vote-contours.geojson")
out = Path(__file__).parent / "data_app" / "geo" / "bv"
info = prep_bv.split_bv(src, out)
print("BV split:", info, "->", len(list(out.glob('*.geojson'))), "départements")
