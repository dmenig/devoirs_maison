"""Génère le site statique servi par GitHub Pages : une page, `index.html`.

Remplace l'ancien wrapper Streamlit : la carte étant entièrement côté client, le seul
rôle du serveur était de recoller squelette + CSS + JS (build_map.assemble_map) et
d'inliner l'amorce. C'est désormais fait une fois à la publication, pas à chaque visite.

Les données (`data_app/`, ~1,4 Go) dépassent la limite d'un site Pages : elles restent
servies depuis le dépôt par raw.githubusercontent, via `--base`.
"""

from __future__ import annotations

import argparse
import pathlib
import shutil

from build_map import assemble_map
from prep_seed import amorce

RACINE = pathlib.Path(__file__).parent
BASE_DEFAUT = "https://raw.githubusercontent.com/lfi-pee/devoirs_maison/master/data_app"
# L'amorce (vue France inlinée) pèse ~400 Ko. Nettement moins = data_app est incomplet
# — cas typique d'un checkout partiel en CI : on échoue plutôt que de publier une page
# qui « marche » en repassant silencieusement par le réseau au premier tracé.
AMORCE_MINI = 100_000


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("--base", default=BASE_DEFAUT, help="racine des données servies")
    p.add_argument("--sortie", type=pathlib.Path, default=RACINE / "_site")
    args = p.parse_args()

    octets = amorce(RACINE / "data_app").octets
    if octets < AMORCE_MINI:
        raise SystemExit(f"amorce de {octets} o : data_app/ incomplet ou absent")

    shutil.rmtree(args.sortie, ignore_errors=True)
    args.sortie.mkdir(parents=True)
    page = args.sortie / "index.html"
    page.write_text(assemble_map(args.base), encoding="utf-8")
    (args.sortie / ".nojekyll").touch()  # sinon Pages ignore les fichiers en `_`
    print(f"{page} : {page.stat().st_size / 1024:.0f} Ko (base {args.base})")


if __name__ == "__main__":
    main()
