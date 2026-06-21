"""Régénère les contours PLEINE RÉSOLUTION (pas de simplification) — chargés
paresseusement par l'app selon la zone affichée."""

from pathlib import Path
import prep_geo

GEO = Path(__file__).parent / "data_app" / "geo"
RAW = Path("/home/veesion/hexagonal/data/01_raw")
GEO.mkdir(parents=True, exist_ok=True)
prep_geo.contours_de_base(GEO)
prep_geo.contours_communes(GEO)
# Échelle circonscription retirée (présidentielle, cf. EVOLUTIONS.md chantier 1) : plus
# de contours circo à régénérer.
gpkg = RAW / "ign" / "iris-metropole.gpkg"
if gpkg.exists():
    prep_geo.contours_iris(gpkg, GEO)
    print("IRIS OK")
# nettoyage des intermédiaires
(GEO / "_communes_full.geojson").unlink(missing_ok=True)
print("regen done")
