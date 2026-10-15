"""Descarga de Wikipedia los componentes de los grandes índices y escribe data/raw/universe.json
({ticker_yahoo: [índices]}). Es un volcado puntual; los índices cambian, así que conviene repetirlo
cada temporada. Uso: python scripts/fetch_constituents.py
"""
from __future__ import annotations

import io
import json
import re
import sys
from pathlib import Path

import pandas as pd
import requests

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "raw" / "universe.json"
HEADERS = {"User-Agent": "CapitalDex/0.1 (juego de navegador; https://kaminarishop.store)"}

# (id del set, URL, columnas candidatas con el ticker, función de normalización a símbolo Yahoo, mínimo de filas)
def us(t: str) -> str:
    return t.replace(".", "-")

def suffix(sfx: str):
    def f(t: str) -> str:
        t = t.split(":")[-1].strip()  # "SEHK: 5" → "5"
        t = re.sub(r"\.(PA|MI|AS|SW|ST|L|T|HK|NS|TO|AX|SA|MX)$", "", t)  # por si ya lo trae
        t = t.replace(" ", "-").replace(".", "-").rstrip("-")
        return f"{t}{sfx}"
    return f

def hk(t: str) -> str:
    t = re.sub(r"\D", "", t.split(":")[-1])
    return f"{int(t):04d}.HK" if t else ""

def tokyo(t: str) -> str:
    t = re.sub(r"\D", "", t.split(":")[-1])
    return f"{t}.T" if len(t) == 4 else ""

INDICES = [
    ("SP500", "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies", ["Symbol"], us, 400),
    ("FTSE100", "https://en.wikipedia.org/wiki/FTSE_100_Index", ["Ticker", "EPIC"], suffix(".L"), 80),
    ("CAC40", "https://en.wikipedia.org/wiki/CAC_40", ["Ticker"], suffix(".PA"), 30),
    ("FTSEMIB", "https://en.wikipedia.org/wiki/FTSE_MIB", ["Ticker"], suffix(".MI"), 30),
    ("AEX", "https://en.wikipedia.org/wiki/AEX_index", ["Ticker symbol", "Ticker"], suffix(".AS"), 20),
    ("SMI", "https://en.wikipedia.org/wiki/Swiss_Market_Index", ["Ticker"], suffix(".SW"), 15),
    ("OMXS30", "https://en.wikipedia.org/wiki/OMX_Stockholm_30", ["Ticker", "Symbol"], suffix(".ST"), 25),
    ("NIKKEI225", "https://en.wikipedia.org/wiki/Nikkei_225", ["Ticker", "Code", "Securities code", "Symbol"], tokyo, 150),
    ("HANGSENG", "https://en.wikipedia.org/wiki/Hang_Seng_Index", ["Ticker", "Stock code", "Code"], hk, 50),
    ("NIFTY50", "https://en.wikipedia.org/wiki/NIFTY_50", ["Symbol", "Ticker"], suffix(".NS"), 40),
    ("TSX60", "https://en.wikipedia.org/wiki/S%26P/TSX_60", ["Symbol", "Ticker"], suffix(".TO"), 50),
    ("ASX50", "https://en.wikipedia.org/wiki/S%26P/ASX_50", ["Code", "Ticker", "Symbol"], suffix(".AX"), 40),
    ("IBOVESPA", "https://en.wikipedia.org/wiki/Ibovespa", ["Ticker", "Code", "Symbol"], suffix(".SA"), 50),
    ("IPC", "https://en.wikipedia.org/wiki/Indice_de_Precios_y_Cotizaciones", ["Ticker", "Symbol", "Code"], suffix(".MX"), 25),
]


def tickers_from(url: str, candidates: list[str], minimum: int) -> list[str]:
    html = requests.get(url, headers=HEADERS, timeout=60).text
    tables = pd.read_html(io.StringIO(html))
    best: list[str] = []
    for t in tables:
        cols = [str(c) for c in t.columns]
        for cand in candidates:
            match = next((c for c in cols if c.strip().lower() == cand.lower()), None)
            if match is None:
                continue
            values = [str(v).strip() for v in t[match].tolist() if str(v).strip() and str(v) != "nan"]
            if len(values) >= minimum and len(values) > len(best):
                best = values
    return best


def main() -> None:
    universe: dict[str, set[str]] = {}
    for idx, url, cands, norm, minimum in INDICES:
        try:
            raw = tickers_from(url, cands, minimum)
            symbols = [s for s in (norm(v) for v in raw) if s and len(s) <= 14]
            for s in symbols:
                universe.setdefault(s, set()).add(idx)
            print(f"{idx:10s} {len(symbols):4d}  p.ej. {symbols[:3]}", flush=True)
        except Exception as e:  # noqa: BLE001
            print(f"{idx:10s} ERROR {e}", flush=True)
    OUT.write_text(json.dumps({k: sorted(v) for k, v in sorted(universe.items())}, indent=0, ensure_ascii=False), encoding="utf-8")
    print(f"{len(universe)} tickers -> {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    sys.exit(main())
