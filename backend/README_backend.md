# 🧠 FinGraph Sentinel – Backend Detection Engine


## Overview

The backend is built using FastAPI and is responsible for:

Parsing transaction CSV files

Building transaction graphs

Detecting fraud rings

Computing suspicion scores

Generating structured JSON output

The backend processes up to 10,000 transactions in under 2 seconds.

**📌 API Endpoint**
POST /analyze

Input:
Multipart form-data with CSV file.

Output:
Structured JSON:

{
  "suspicious_accounts": [],
  "fraud_rings": [],
  "summary": {},
  "graph": {}
}

**🔍 Detection Modules**

The backend includes three core detection engines:

1️⃣ Cycle Detection

Algorithm: Depth-Limited Iterative DFS

Detects cycles of length 3–5

Deduplicated using sorted tuple hashing

Time Complexity: O(V + E)

2️⃣ Smurfing Detection

Algorithm: Temporal Bucketing (72-hour window)

Fan-in: ≥10 senders → 1 receiver

Fan-out: 1 sender → ≥10 receivers

Time Complexity: O(N log N)

Uses Pandas groupby for optimized aggregation.

3️⃣ Shell Network Detection

Algorithm: Constrained DFS Path Expansion

Identifies chains with low-degree intermediates (2–3 degree nodes)

Path length ≥3 hops

Time Complexity: O(V + E) with bounded depth

**🎯 Suspicion Scoring Engine**

Each account receives a dynamic score based on:

Pattern weight

Ring size bonus

Multi-ring participation

Score normalization (max 100)

**🛡 Merchant Protection Logic**

Accounts are classified as legitimate merchants if:

Total transactions > 50

Active > 7 days

In/Out transaction ratio between 0.3 and 3

Prevents false positives.

**📊 Performance**

Tested on:

100 transactions → < 0.2 sec

1,000 transactions → < 0.5 sec

10,000 transactions → ~1.3 sec

⚙ Installation
pip install -r requirements.txt

▶ Run Locally
uvicorn app.main:app --reload


Backend runs on:

http://127.0.0.1:8000

📁 Expected CSV Format

Required columns:

transaction_id
sender_id
receiver_id
amount
timestamp


Timestamp must be ISO format.

**🧪 Future Improvements**

Graph centrality analysis

Real-time streaming ingestion

Anomaly ML model integration

Multi-bank network federation

**🧩 Folder Structure**
backend/
├── app/
│   ├── main.py
│   ├── detection/
│   ├── scoring_engine.py
│   └── merchant_protection.py
├── requirements.txt
└── README_backend.md

**License**
MIT License
