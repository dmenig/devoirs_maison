"""Génère le site statique servi par GitHub Pages : `index.html`, `v2/`, `v3/`.

Remplace l'ancien wrapper Streamlit : la carte étant entièrement côté client, le seul
rôle du serveur était de recoller squelette + CSS + JS (build_map.assemble_map) et
d'inliner l'amorce. C'est désormais fait une fois à la publication, pas à chaque visite.

**Trois pages, un seul dépôt, une seule branche.** Les trois versions de l'atlas
(cf. `build_map.VERSIONS`) ne diffèrent que par la définition des « voix à conquérir ».
Plutôt qu'un commutateur d'affichage dans une page unique, chacune est publiée comme un
site à part entière, à son URL, avec son numéro figé dedans : ce qu'on compare n'est pas
un réglage mais bien deux sites, et une URL partagée décrit sans ambiguïté ce qu'a vu
celui qui l'envoie. Le sélecteur en haut de carte n'est qu'un lien de l'une à l'autre.

Les données (`data_app/`, ~1,4 Go) dépassent la limite d'un site Pages : elles restent
servies depuis le dépôt par raw.githubusercontent, via `--base`. Les trois versions
partagent EXACTEMENT le même `data_app` — les clés des trois définitions du score y sont
bakées côte à côte (cf. prep_bake), chaque version n'en colorant qu'une.
"""

from __future__ import annotations

import argparse
import pathlib
import shutil

from build_map import VERSIONS, assemble_map
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
    (args.sortie / ".nojekyll").touch()  # sinon Pages ignore les fichiers en `_`
    for version, (chemin, libelle, _desc) in VERSIONS.items():
        page = args.sortie / chemin / "index.html"
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(assemble_map(args.base, version), encoding="utf-8")
        print(
            f"{page} : {page.stat().st_size / 1024:.0f} Ko "
            f"(v{version} « {libelle} »)"
        )
    print(f"base : {args.base}")


if __name__ == "__main__":
    main()
