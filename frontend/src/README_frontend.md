# 🎨 FinGraph Sentinel – Frontend
## Interactive Graph-Based Financial Crime Visualization Interface
**🚀 Overview**

The frontend of FinGraph Sentinel is built using React and provides an interactive visualization of financial transaction networks.

It allows users to:

Upload transaction CSV files

Visualize transaction graphs

Identify suspicious accounts

Explore detected fraud rings

Apply advanced graph filters

Download structured JSON results

The interface is optimized for clarity, performance, and investigative usability.
**🧰 Tech Stack**

React.js

ForceGraph2D

Axios

Tailwind CSS

JavaScript (ES6+)

**🏗 Architecture Overview**
User Upload
    ↓
React Frontend
    ↓
API Call (Axios)
    ↓
FastAPI Backend
    ↓
JSON Response
    ↓
Graph Rendering + Filters

**🔍 Key Features**
1️⃣ CSV Upload Interface

Accepts .csv transaction files

Sends multipart form-data to backend

Displays loading state during processing

2️⃣ Interactive Transaction Graph

Built using ForceGraph2D

Features:

Directed edges with arrows

Node labeling

Suspicious node highlighting (red)

Normal accounts (green)

Clickable nodes

Drag & zoom support

Smooth simulation rendering

3️⃣ Graph Filters

Users can filter by:

Show All Accounts

Suspicious Accounts Only

Normal Accounts Only

Specific Fraud Ring

Pattern Type (Cycle / Smurfing / Shell Chain)

Filtering dynamically updates graph without breaking layout.

4️⃣ Suspicious Account Details Panel

Clicking a node shows:

Account ID

Suspicion Score

Detected Patterns

Ring Participation

Provides investigator-style drill-down capability.

5️⃣ Fraud Ring Summary Table

Displays:

Ring ID

Pattern Type

Member Accounts

Risk Score

Allows quick ring-level analysis.

6️⃣ JSON Export

Users can download full structured results for:

Reporting

Compliance review

Further analysis

**🎯 UI Design Philosophy**

The frontend is designed for:

Investigative clarity

Minimal clutter

High contrast fraud highlighting

Smooth interaction

Real-time visual feedback

Colors Used:

🟢 Green → Normal accounts

🔴 Red → Suspicious accounts

🟡 Yellow → Money flow direction

⚪ White → Node labels

⚙ Installation & Setup
cd frontend
npm install
npm start


App runs at:

http://localhost:3000

**🔌 Backend Connection**

Update API URL inside App.jsx:

const API_URL = "http://127.0.0.1:8000/analyze";


For production deployment, replace with live backend URL.

**📁 Folder Structure**
frontend/
├── src/
│   ├── components/
│   │   ├── GraphView.jsx
│   │   ├── Filters.jsx
│   │   ├── SummaryCards.jsx
│   │   └── FraudTable.jsx
│   ├── App.jsx
│   └── index.js
├── package.json
└── README_frontend.md

**📊 Performance**

Handles 10,000 nodes smoothly

Efficient re-rendering using React state

Optimized link normalization to prevent graph corruption

No forced zoom resets

Stable drag and simulation behavior
**🚀 Future Enhancements**

Risk heatmap gradient visualization

Ring leader highlighting (centrality-based)

Real-time streaming updates

Advanced zoom clustering

Edge weight visualization

**🎨 Deployment**
Recommended platforms:

Vercel

Netlify

Ensure:

Backend CORS enabled

Environment variables configured properly

**📜 License**

MIT License
