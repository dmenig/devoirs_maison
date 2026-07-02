"""Régénère uniquement les tables de résultats électoraux (resultats_*.parquet) depuis
hexagonal, sans retoucher socio / admin / contours. À lancer après un correctif du
pipeline électoral, puis enchaîner prep_bake.py."""

from pathlib import Path

from prep_elections import construire_resultats
from prepare_data import charger_cog

CLEAN = Path("/home/veesion/hexagonal/data") / "02_clean"
OUT = Path(__file__).parent / "data_app"
# Table des listes conduites par LFI (2026) : requalifie en LFI les listes que le
# ministère étiquette LDVG/LUG mais dont la tête de liste est insoumise, sans compter
# les listes d'union simplement soutenues (cf. charger_listes_lfi).
LISTES_LFI = (
    Path("/home/veesion/hexagonal/data")
    / "01_raw"
    / "lafranceinsoumise"
    / "2026-municipales-1-listes-lfi.parquet"
)

communes, _ = charger_cog()
resultats = construire_resultats(
    CLEAN / "elections",
    communes,
    OUT / "geo" / "bv",
    LISTES_LFI if LISTES_LFI.exists() else None,
)
for niveau, df in resultats.items():
    df.to_parquet(OUT / f"resultats_{niveau}.parquet", index=False)
    print(f"   {niveau}: {len(df)} lignes")
print("regen elections done")
