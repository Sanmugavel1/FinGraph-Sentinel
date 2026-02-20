from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import time
import io
from collections import defaultdict

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# CYCLE DETECTION (Accurate + Fast + Dedup Safe)
# ---------------------------------------------------------
def detect_cycles(adjacency):

    cycles = []
    seen = set()

    for start in adjacency:
        stack = [(start, [start])]

        while stack:
            current, path = stack.pop()

            if len(path) > 5:
                continue

            for neighbor in adjacency.get(current, []):
                if neighbor == start and len(path) >= 3:
                    key = tuple(sorted(path))
                    if key not in seen:
                        seen.add(key)
                        cycles.append(path.copy())
                elif neighbor not in path:
                    stack.append((neighbor, path + [neighbor]))

    return cycles


# ---------------------------------------------------------
# SMURFING (Already Accurate)
# ---------------------------------------------------------
def detect_smurfing(df, merchant_safe):

    df = df.copy()
    df["epoch"] = df["timestamp"].astype("int64") // 10**9
    df["bucket"] = df["epoch"] // (72 * 3600)

    rings = []
    seen = set()

    for _, group in df.groupby("bucket"):

        if len(group) < 10:
            continue

        fan_in = group.groupby("receiver_id")["sender_id"].nunique()
        for receiver, count in fan_in.items():
            if count >= 10 and receiver not in merchant_safe:
                senders = group[group["receiver_id"] == receiver]["sender_id"].unique()
                members = list(senders) + [receiver]
                key = tuple(sorted(members))
                if key not in seen:
                    seen.add(key)
                    rings.append(members)

        fan_out = group.groupby("sender_id")["receiver_id"].nunique()
        for sender, count in fan_out.items():
            if count >= 10 and sender not in merchant_safe:
                receivers = group[group["sender_id"] == sender]["receiver_id"].unique()
                members = list(receivers) + [sender]
                key = tuple(sorted(members))
                if key not in seen:
                    seen.add(key)
                    rings.append(members)

    return rings


# ---------------------------------------------------------
# SHELL DETECTION (Accurate Dedup)
# ---------------------------------------------------------
def detect_shell(df, merchant_safe):

    adjacency = defaultdict(list)
    in_deg = defaultdict(int)
    out_deg = defaultdict(int)

    for s, r in zip(df["sender_id"], df["receiver_id"]):
        adjacency[s].append(r)
        out_deg[s] += 1
        in_deg[r] += 1

    total_deg = {n: in_deg[n] + out_deg[n] for n in set(in_deg) | set(out_deg)}
    shell_nodes = {n for n, d in total_deg.items() if 2 <= d <= 3}

    rings = []
    seen = set()

    for start in adjacency:
        stack = [(start, [start])]

        while stack:
            current, path = stack.pop()

            if len(path) > 6:
                continue

            for neighbor in adjacency.get(current, []):
                if neighbor in path:
                    continue

                new_path = path + [neighbor]

                if len(new_path) >= 4:
                    intermediates = new_path[1:-1]
                    if (
                        all(n in shell_nodes for n in intermediates)
                        and new_path[0] not in merchant_safe
                        and new_path[-1] not in merchant_safe
                    ):
                        key = tuple(sorted(new_path))
                        if key not in seen:
                            seen.add(key)
                            rings.append(new_path)

                stack.append((neighbor, new_path))

    return rings


# ---------------------------------------------------------
# MAIN API
# ---------------------------------------------------------
@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):

    try:
        start_time = time.time()
        contents = await file.read()
        df = pd.read_csv(io.BytesIO(contents))

        required_columns = [
            "transaction_id",
            "sender_id",
            "receiver_id",
            "amount",
            "timestamp"
        ]

        for col in required_columns:
            if col not in df.columns:
                return {"error": f"Missing required column: {col}"}

        df["timestamp"] = pd.to_datetime(df["timestamp"], errors="coerce")
        df = df.dropna(subset=["timestamp"])
        df["date"] = df["timestamp"].dt.date

        # Accurate total accounts
        all_accounts = set(df["sender_id"]) | set(df["receiver_id"])

        # Merchant protection
        in_deg = df.groupby("receiver_id").size()
        out_deg = df.groupby("sender_id").size()
        total_deg = in_deg.add(out_deg, fill_value=0)

        active_days = df.groupby("sender_id")["date"].nunique().add(
            df.groupby("receiver_id")["date"].nunique(), fill_value=0
        )

        merchant_safe = set()
        for acc in total_deg.index:
            deg = total_deg.get(acc, 0)
            days = active_days.get(acc, 0)
            in_c = in_deg.get(acc, 0)
            out_c = out_deg.get(acc, 0)
            ratio = (in_c + 1) / (out_c + 1)

            if deg > 50 and days > 7 and 0.3 <= ratio <= 3:
                merchant_safe.add(acc)

        # Build adjacency
        adjacency = defaultdict(list)
        for s, r in zip(df["sender_id"], df["receiver_id"]):
            adjacency[s].append(r)

        # Detect
        cycle_rings = detect_cycles(adjacency)
        smurf_rings = detect_smurfing(df, merchant_safe)
        shell_rings = detect_shell(df, merchant_safe)

        suspicious_accounts = {}
        fraud_rings = []
        ring_counter = 1

        # Pattern base weights
        PATTERN_WEIGHT = {
            "cycle": 40,
            "smurfing": 30,
            "shell_chain": 35
        }

        def register_ring(members, pattern, risk):

            nonlocal ring_counter

            ring_id = f"RING_{ring_counter:03d}"
            ring_counter += 1

            fraud_rings.append({
                "ring_id": ring_id,
                "pattern_type": pattern,
                "member_count": len(members),   # ✅ NEW FIELD
                "risk_score": risk,
                "member_accounts": members
            })

            ring_size_bonus = min(len(members) * 2, 20)
            base_weight = PATTERN_WEIGHT.get(pattern, 25)

            for acc in members:

                dynamic_score = base_weight + ring_size_bonus

                if acc not in suspicious_accounts:
                    suspicious_accounts[acc] = {
                        "account_id": acc,
                        "suspicion_score": dynamic_score,
                        "detected_patterns": [pattern],
                        "ring_id": [ring_id],
                        "ring_count": 1
                    }
                else:
                    suspicious_accounts[acc]["detected_patterns"].append(pattern)
                    suspicious_accounts[acc]["ring_id"].append(ring_id)
                    suspicious_accounts[acc]["ring_count"] += 1

                    # Bonus for multiple rings
                    suspicious_accounts[acc]["suspicion_score"] += (
                        base_weight * 0.5
                    )

        for r in cycle_rings:
            register_ring(r, "cycle", 95.0)

        for r in smurf_rings:
            register_ring(r, "smurfing", 90.0)

        for r in shell_rings:
            register_ring(r, "shell_chain", 92.0)

        # Normalize score (cap at 100)
        for acc in suspicious_accounts:
            suspicious_accounts[acc]["suspicion_score"] = min(
                round(suspicious_accounts[acc]["suspicion_score"], 2), 100
            )


        processing_time = round(time.time() - start_time, 2)

                # -----------------------------
        # GRAPH DATA PREPARATION
        # -----------------------------
        graph_nodes = list(all_accounts)

        graph_links = [
            {
                "source": row["sender_id"],
                "target": row["receiver_id"],
                "timestamp": row["timestamp"].strftime("%Y-%m-%d %H:%M:%S")
            }
            for _, row in df.iterrows()
        ]

        # Map account -> rings
        account_to_rings = {}
        for ring in fraud_rings:
            for member in ring["member_accounts"]:
                account_to_rings.setdefault(member, []).append(ring["ring_id"])


        return {
            "suspicious_accounts": list(suspicious_accounts.values()),
            "fraud_rings": fraud_rings,
            "summary": {
                "total_accounts_analyzed": len(all_accounts),
                "suspicious_accounts_flagged": len(suspicious_accounts),
                "fraud_rings_detected": len(fraud_rings),
                "processing_time_seconds": processing_time
            },
            "graph": {
                "nodes": graph_nodes,
                "links": graph_links,
                "account_ring_map": account_to_rings
            }
        }


    except Exception as e:

        return {"error": str(e)}

