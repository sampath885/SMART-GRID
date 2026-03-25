# GRID-AI React Dashboard - Setup Guide

## 🚀 Installation & Running

### Prerequisites
- Node.js 16+ installed
- Backend (FastAPI) running on `http://127.0.0.1:8000`

### Quick Start

```bash
cd frontend_new

# Install dependencies
npm install

# Start development server
npm run dev
```

The React app will start on **`http://127.0.0.1:5173`**

### Build for Production

```bash
npm run build
npm run preview
```

---

## 📁 Project Structure

```
frontend_new/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── Card.jsx        # Base card component
│   │   ├── Header.jsx      # Top navigation bar
│   │   ├── Sidebar.jsx     # Left sidebar navigation
│   │   ├── MetricCard.jsx  # KPI card display
│   │   └── UploadWidget.jsx# CSV file upload
│   ├── pages/              # Route pages
│   │   ├── Dashboard.jsx   # Home page with welcome
│   │   ├── Analysis.jsx    # AI predictions & advisory
│   │   ├── Forecast.jsx    # 24-hour forecasting
│   │   ├── WhatIf.jsx      # Load shifting simulator
│   │   ├── Historical.jsx  # Data trends & history
│   │   └── ApiDocs.jsx     # API documentation
│   ├── styles/
│   │   └── globals.css     # Global styling
│   ├── theme.js            # Design system (colors, spacing)
│   ├── App.jsx             # Main app component & router
│   └── main.jsx            # React entry point
├── index.html              # HTML template
├── package.json            # Dependencies
└── vite.config.js          # Vite bundler config
```

---

## 🎨 Design Features

### Color Palette
- **Primary**: Dark Slate (`#0a0e15` - `#1a2230`)
- **Accent**: Professional Teal (`#0d9488` - `#14b8a6`)
- **Status**: Success (`#10b981`), Warning (`#f59e0b`), Error (`#ef4444`)

### Typography
- Font: Inter (Google Fonts)
- Hierarchy: Bold headings, medium body, secondary muted text
- Spacing: Consistent 8px grid system

### Animations
- Smooth transitions (0.3s)
- Fade-in on page load
- Hover states on interactive elements
- Glow effect on accent elements

---

## 📱 Features

### Dashboard
- Welcome section with system status
- Quick start guide (4-step introduction)
- CSV upload widget
- Real-time KPI cards (Load, Status, Uptime, Efficiency)

### Analysis
- Upload data → View predictions
- Grid status indicator
- AI recommendations with feature importance

### 24-Hour Forecast
- Recursive forecasting visualization
- Max/Avg/Status metrics for 24h period
- Explanation of forecasting methodology

### What-If Reactor (Week 6)
- Interactive slider for load shifting (0-100%)
- Real-time scenario comparison
- Original vs. With-Shift metrics
- Actionable recommendations

### Historical Data (NEW)
- 5-day trends table
- Max load tracking
- System efficiency metrics
- Status history

### API Documentation (NEW)
- All endpoint references
- Request/response formats
- Example code snippets
- Feature highlight list

---

## 🔌 Backend Integration

The React app communicates with the FastAPI backend via:

```javascript
// Proxy configuration in vite.config.js
/api/*  →  http://127.0.0.1:8000/*
```

Endpoints:
- `POST /api/predict-and-advise` - Upload & analyze
- `GET /api/what-if-scenario` - Load shifting
- `GET /api/forecast-24h` - 24-hour forecast

---

## 📊 Future Enhancements

- [ ] Add Chart.js visualizations (line/bar charts)
- [ ] Real-time WebSocket updates
- [ ] Export data to PDF/CSV
- [ ] Dark/Light theme toggle
- [ ] User authentication
- [ ] Database integration for historical data
- [ ] Advanced filters and search

---

## 🛠️ Troubleshooting

### Port 5173 already in use
```bash
npm run dev -- --port 5174
```

### API calls failing
- Ensure FastAPI backend is running on `http://127.0.0.1:8000`
- Check browser console for CORS errors
- Verify vite.config.js proxy settings

### Styling issues
- Clear browser cache (Cmd+Shift+R or Ctrl+Shift+R)
- Check that theme.js is properly imported

---

## 👨‍💻 Development Tips

- Keep all styling in `src/theme.js` for consistency
- Use Card component as base for all containers
- Follow the existing folder structure for new pages
- Test responsive design at multiple breakpoints

Enjoy building! 🎉
