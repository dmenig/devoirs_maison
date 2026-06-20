"""Régénère uniquement les tables de résultats électoraux (resultats_*.parquet) depuis
hexagonal, sans retoucher socio / admin / contours. À lancer après un correctif du
pipeline électoral, puis enchaîner prep_bake.py."""

from pathlib import Path

from prep_elections import construire_resultats
from prepare_data import charger_cog, charger_correspondances

CLEAN = Path("/home/veesion/hexagonal/data") / "02_clean"
OUT = Path(__file__).parent / "data_app"

communes, _ = charger_cog()
resultats = construire_resultats(
    CLEAN / "elections", communes, charger_correspondances(), OUT / "geo" / "bv"
)
for niveau, df in resultats.items():
    df.to_parquet(OUT / f"resultats_{niveau}.parquet", index=False)
    print(f"   {niveau}: {len(df)} lignes")
print("regen elections done")
