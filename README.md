**💰 FinGraph Sentinel
Graph-Based Money Muling Detection Engine**

🚀 Live Demo

**🔗 Live Application URL:**

Publicly accessible. No authentication required.
Upload CSV directly from homepage.

**📌 Problem Statement**

Money muling networks exploit financial systems by moving funds through interconnected accounts to obscure the origin of illicit money.

These networks use:

Circular fund routing

Smurfing patterns (fan-in / fan-out)

Layered shell accounts

Traditional rule-based systems fail to detect complex networked fraud structures.

FinGraph Sentinel solves this using advanced graph analytics and temporal transaction analysis.

**🧠 Tech Stack**
Backend

Python 3.11

FastAPI

Pandas

NetworkX (graph logic concepts)

Uvicorn

Frontend

React.js

ForceGraph2D

Axios

Tailwind CSS

Deployment

Backend: Render / Railway

Frontend: Vercel / Netlify

**🏗 System Architecture**
User Uploads CSV
        ↓
Frontend (React)
        ↓
FastAPI Backend
        ↓
Graph Builder
        ↓
Detection Engine
    ├─ Cycle Detection
    ├─ Smurfing Detection
    ├─ Shell Network Detection
        ↓
Risk Scoring Engine
        ↓
JSON Response
        ↓
Interactive Graph Visualization

**🔍 Algorithm Approach**
1️⃣ Circular Fund Routing (Cycle Detection)

Objective: Detect loops of length 3–5.

Algorithm Used:
Depth-Limited Iterative DFS

Why:
Efficient traversal without recursion explosion.

Time Complexity:
O(V + E) for traversal
Bounded by max depth (5)

Detection Logic:

Start DFS from each node

Track path

If returning to origin within 3–5 hops → Fraud Ring

Deduplicate using sorted tuple hashing

2️⃣ Smurfing Patterns (Fan-In / Fan-Out)

Objective: Detect aggregation and dispersion within 72 hours.

Algorithm Used:
Temporal Bucketing + GroupBy Aggregation

Why:
Efficient vectorized processing using Pandas.

Time Complexity:
O(N log N) (groupby operations)

Detection Logic:

Convert timestamp to epoch

Create 72-hour buckets

Fan-in: ≥10 senders → 1 receiver

Fan-out: 1 sender → ≥10 receivers

Exclude merchant-safe accounts

3️⃣ Layered Shell Networks

Objective: Detect 3+ hop chains through low-degree accounts.

Algorithm Used:
Constrained DFS Path Expansion

Why:
Controlled path growth avoids exponential blow-up.

Time Complexity:
O(V + E) with depth bound (6)

Detection Logic:

Identify shell accounts (degree 2–3)

Expand paths

Ensure intermediates are shell nodes

Endpoints must not be merchant-safe

🎯 Suspicion Score Methodology

Each account receives a dynamic suspicion score.

Pattern Base Weights
Pattern	Weight
Cycle	40
Smurfing	30
Shell Chain	35
Ring Size Bonus
min(ring_size × 2, 20)


Larger coordinated rings = higher risk.

Multi-Ring Bonus

If account appears in multiple rings:

+ 50% of base weight per additional ring

Final Score Normalization
Score capped at 100

🛡 False Positive Control

Merchant Protection Logic:

Account is classified as "safe merchant" if:

Total transactions > 50

Active across > 7 days

In/Out transaction ratio between 0.3 and 3

Prevents:

Payroll systems

Large retailers

Legitimate aggregators

📊 Performance Metrics

Dataset size tested: 10,000 transactions

Processing time: ~1–2 seconds

Precision Target: ≥70%

Recall Target: ≥60%

Zero flagging of legitimate high-volume merchants

⚙ Installation & Setup
Backend
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

Frontend
cd frontend
npm install
npm start

**🚀 Usage Instructions**

Open Live Demo URL

Upload transaction CSV file

Click "Analyze"

View:

Suspicious accounts

Fraud rings

Risk scores

Interactive graph

Use filters:

Suspicious only

Specific ring

Pattern type

Download JSON results

**📁 CSV Format Required**

Required Columns:

transaction_id
sender_id
receiver_id
amount
timestamp


**🚀 Future Improvements**

Graph centrality-based ring leader detection

Real-time streaming ingestion

Machine learning anomaly scoring

Risk heatmap visualization

Cross-bank federation detection

**👥 Team Members**

Ctrl + Shift + Win

Sanmugavel B– Frontend & Visualization
Ganesan M – Risk Scoring & System Design
Azhagumurugan R – Backend & Graph Algorithms
Monish Kumar A - Researching the existing methods and solving the problems in that

**📜 License**

MIT License

**Tagline**

Turning Transaction Networks into Actionable Financial Intelligence
