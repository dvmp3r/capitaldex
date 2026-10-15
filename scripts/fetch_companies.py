"""Descarga datos fundamentales de las empresas del juego desde Yahoo Finance (yfinance).

Uso:  python scripts/fetch_companies.py
Salida: data/raw/yahoo_info.json  y  data/raw/fx.json

Es un volcado puntual para construir la hoja de rareza y el JSON del juego.
No se usa en producción: ahí los precios diarios los cachea el servidor.
"""
import json, sys, time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

import yfinance as yf

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
RAW.mkdir(parents=True, exist_ok=True)

# --- Universo de empresas (ticker Yahoo -> índices a los que pertenece) ---------
# Pertenencias aproximadas a octubre 2026; revisar antes de cada temporada.
DOW30 = "AAPL AMGN AMZN AXP BA CAT CRM CSCO CVX DIS GS HD HON IBM JNJ JPM KO MCD MMM MRK MSFT NKE NVDA PG SHW TRV UNH V VZ WMT".split()

NASDAQ100 = """AAPL ABNB ADBE ADI ADP ADSK AEP AMAT AMD AMGN AMZN APP ARM ASML.AS AVGO AXON AZN.L
BIIB BKNG BKR CCEP CDNS CDW CEG CHTR CMCSA COST CPRT CRWD CSCO CSGP CSX CTAS CTSH DASH DDOG DXCM
EA EXC FANG FAST FTNT GEHC GFS GILD GOOGL HON IDXX INTC INTU ISRG KDP KHC KLAC LIN LRCX LULU MAR
MCHP MDLZ MELI META MNST MRVL MSFT MSTR MU NFLX NVDA NXPI ODFL ON ORLY PANW PAYX PCAR PDD PEP PLTR
PYPL QCOM REGN ROP ROST SBUX SHOP SNPS TEAM TMUS TRI TSLA TTD TTWO TXN VRSK VRTX WBD WDAY XEL ZS""".split()

# Grandes de EE. UU. fuera del Nasdaq-100 / Dow (S&P 500)
USA_EXTRA = """BRK-B LLY V MA UNH XOM JPM PG JNJ HD WMT ABBV BAC ORCL KO CVX MRK TMO ACN MCD WFC ABT GE
PM IBM CAT NOW DHR GS NEE PFE SPGI RTX UBER LOW AXP PGR T UNP BLK ETN MS SYK TJX COP C BSX SCHW
FI MDT LMT BMY DE PLD CB MMC MO SO ELV CI UPS BA DUK CVS CMG ICE WM APH ZTS GEV KKR MCO AON CL
EQIX TGT ITW CME PNC USB FDX GD NOC MMM TRV SHW NKE ANET CRM DIS HCA BX APO ECL EMR COF AJG
WELL PSA O SPG CARR OTIS HLT RSG PH TT NSC GM F DELL HPQ NEM FCX SLB EOG OXY MPC PSX VLO""".split()

IBEX35 = """ACS.MC ACX.MC AENA.MC AMS.MC ANA.MC ANE.MC BBVA.MC BKT.MC CABK.MC CLNX.MC COL.MC ELE.MC
ENG.MC FDR.MC FER.MC GRF.MC IAG.MC IBE.MC IDR.MC ITX.MC LOG.MC MAP.MC MRL.MC MTS.MC NTGY.MC
PUIG.MC RED.MC REP.MC ROVI.MC SAB.MC SAN.MC SCYR.MC SLR.MC TEF.MC UNI.MC""".split()

DAX40 = """ADS.DE AIR.PA ALV.DE BAS.DE BAYN.DE BEI.DE BMW.DE BNR.DE CBK.DE CON.DE DTG.DE
DBK.DE DB1.DE DHL.DE DTE.DE EOAN.DE FRE.DE FME.DE HNR1.DE HEI.DE HEN3.DE IFX.DE MBG.DE MRK.DE
MTX.DE MUV2.DE P911.DE PAH3.DE QIA.DE RHM.DE RWE.DE SAP.DE SRT3.DE SIE.DE ENR.DE SHL.DE SY1.DE
VNA.DE VOW3.DE ZAL.DE""".split()

EUROSTOXX50 = """ADS.DE ADYEN.AS AI.PA AIR.PA ALV.DE ASML.AS BAS.DE BAYN.DE BBVA.MC BMW.DE BN.PA
BNP.PA CS.PA DB1.DE DHL.DE DTE.DE ENEL.MI ENI.MI EL.PA IBE.MC IFX.DE INGA.AS ISP.MI ITX.MC KER.PA
MBG.DE MC.PA MUV2.DE NDA-FI.HE NOKIA.HE OR.PA PRX.AS RACE.MI RI.PA RMS.PA SAF.PA SAN.MC SAN.PA
SAP.DE SIE.DE STLAP.PA SU.PA TTE.PA UCG.MI VOW3.DE WKL.AS ABI.BR AD.AS SGO.PA DG.PA""".split()

UK_TOP = """AZN.L SHEL.L HSBA.L ULVR.L BP.L RIO.L GSK.L DGE.L REL.L BATS.L LSEG.L RR.L BA.L NG.L
LLOY.L BARC.L CPG.L AAL.L GLEN.L TSCO.L""".split()

EUROPA_EXTRA = """NESN.SW ROG.SW NOVN.SW UBSG.SW ZURN.SW ABBN.SW NOVO-B.CO DSV.CO MAERSK-B.CO
EQNR.OL ATCO-A.ST INVE-B.ST VOLV-B.ST ERIC-B.ST SPOT PHIA.AS""".split()

ASIA_TOP = """TSM 7203.T 6758.T 9984.T 8306.T 6861.T 7974.T 6501.T 005930.KS 000660.KS 0700.HK
9988.HK 1398.HK 0941.HK 3690.HK 1810.HK 2222.SR RELIANCE.NS TCS.NS HDFCBANK.NS INFY.NS 600519.SS
BHP.AX CBA.AX""".split()

INDICES = {
    "DOW30": DOW30, "NASDAQ100": NASDAQ100, "IBEX35": IBEX35, "DAX40": DAX40,
    "EUROSTOXX50": EUROSTOXX50, "UK_TOP": UK_TOP, "ASIA_TOP": ASIA_TOP,
}
universe: dict[str, set[str]] = {}
for name, lst in INDICES.items():
    for t in lst:
        universe.setdefault(t, set()).add(name)
for t in USA_EXTRA + EUROPA_EXTRA:
    universe.setdefault(t, set())

FIELDS = ["longName", "shortName", "sector", "industry", "country", "city", "exchange", "currency",
          "marketCap", "netIncomeToCommon", "totalRevenue", "dividendYield", "trailingPE",
          "fullTimeEmployees", "website", "regularMarketPrice", "currentPrice"]


def fetch(ticker: str) -> dict:
    for attempt in range(3):
        try:
            info = yf.Ticker(ticker).info
            if not info or info.get("marketCap") is None:
                raise ValueError("sin marketCap")
            row = {k: info.get(k) for k in FIELDS}
            row["ticker"] = ticker
            row["indices"] = sorted(universe[ticker])
            return row
        except Exception as e:  # noqa: BLE001
            time.sleep(1.5 * (attempt + 1))
            err = str(e)
    return {"ticker": ticker, "indices": sorted(universe[ticker]), "error": err}


def main() -> None:
    tickers = sorted(universe)
    print(f"{len(tickers)} tickers", flush=True)
    rows = []
    with ThreadPoolExecutor(max_workers=3) as ex:
        for i, row in enumerate(ex.map(fetch, tickers), 1):
            rows.append(row)
            if i % 25 == 0:
                print(f"  {i}/{len(tickers)}", flush=True)
    (RAW / "yahoo_info.json").write_text(json.dumps(rows, indent=1, ensure_ascii=False), encoding="utf-8")
    errs = [r["ticker"] for r in rows if "error" in r]
    print(f"OK {len(rows) - len(errs)}  errores {len(errs)}: {errs}", flush=True)

    # Tipos de cambio a USD (1 unidad de moneda local = X USD)
    pairs = {"EUR": "EURUSD=X", "GBP": "GBPUSD=X", "CHF": "CHFUSD=X", "DKK": "DKKUSD=X", "SEK": "SEKUSD=X",
             "NOK": "NOKUSD=X", "JPY": "JPYUSD=X", "HKD": "HKDUSD=X", "KRW": "KRWUSD=X", "TWD": "TWDUSD=X",
             "INR": "INRUSD=X", "SAR": "SARUSD=X", "CNY": "CNYUSD=X", "AUD": "AUDUSD=X"}
    fx = {"USD": 1.0}
    for cur, sym in pairs.items():
        try:
            h = yf.Ticker(sym).history(period="5d")["Close"].dropna()
            fx[cur] = float(h.iloc[-1])
        except Exception as e:  # noqa: BLE001
            print(f"FX {cur} error: {e}", flush=True)
    (RAW / "fx.json").write_text(json.dumps(fx, indent=1), encoding="utf-8")
    print("FX", fx, flush=True)


if __name__ == "__main__":
    sys.exit(main())
