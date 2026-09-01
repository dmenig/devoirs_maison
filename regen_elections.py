"""Régénère uniquement les tables de résultats électoraux (resultats_*.parquet) depuis
hexagonal, sans retoucher socio / admin / contours. À lancer après un correctif du
pipeline électoral, puis enchaîner prep_bake.py."""

from pathlib import Path

from prep_elections import construire_resultats
from prepare_data import HEX, charger_cog

# Même racine que prepare_data (cf. _racine_hexagonal) : ./hexagonal/data d'abord.
CLEAN = HEX / "02_clean"
OUT = Path(__file__).parent / "data_app"
# Table des listes conduites par LFI (2026) : requalifie en LFI les listes que le
# ministère étiquette LDVG/LUG mais dont la tête de liste est insoumise, sans compter
# les listes d'union simplement soutenues (cf. charger_listes_lfi).
# Le fichier a changé de place dans hexagonal (sous-dossier `elections/`) : on essaie les
# deux, sans quoi la requalification des listes LFI 2026 disparaissait en silence.
LISTES_LFI = next(
    (
        f
        for f in (
            HEX / "01_raw/lafranceinsoumise/elections/2026-municipales-1-listes-lfi.parquet",
            HEX / "01_raw/lafranceinsoumise/2026-municipales-1-listes-lfi.parquet",
        )
        if f.exists()
    ),
    None,
)

communes, _ = charger_cog()
resultats = construire_resultats(
    CLEAN / "elections",
    communes,
    OUT / "geo" / "bv",
    LISTES_LFI,
    OUT,
)
for niveau, df in resultats.items():
    df.to_parquet(OUT / f"resultats_{niveau}.parquet", index=False)
    print(f"   {niveau}: {len(df)} lignes")
print("regen elections done")
