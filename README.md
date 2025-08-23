# Norwegian Election Polling Analysis 2025 🇳🇴

A comprehensive system for analyzing Norwegian election polling data with systematic bias correction and professional chart generation.

## 🎯 Quick Start - Generate Charts

The most important feature of this repository is the **chart generation script**:

```bash
# Install dependencies
pnpm install

# Generate charts using pnpm scripts (recommended)
pnpm chart                           # Default 14-day chart
pnpm chart 7                         # Weekly chart
pnpm chart 21 charts/monthly.png     # Custom chart with path
pnpm chart 14 charts/latest.png      # Organized in charts/ folder

# Alternative: Direct script usage
npx tsx generate_chart.ts 7 weekly.png

# See all options
pnpm chart --help
```

## 📊 What You Get

**Professional PNG Charts** with:
- ✅ **Vertical bars** with party labels on bottom
- ✅ **Percentage values** displayed on top of each bar
- ✅ **Norwegian party colors** (Ap=red, Høyre=blue, etc.)
- ✅ **House effect corrections** applied automatically
- ✅ **Original party order** (political spectrum order)
- ✅ **Configurable time windows** (7, 14, 21+ days)

**Plus ASCII charts** for terminal/console display.

## 🏗️ Project Overview

This system processes Norwegian polling data through three key phases:

### Phase 1: Data Processing & House Effects
- Parses Norwegian CSV polling data (semicolon-delimited, DD/M-YYYY dates)
- Calculates **rolling window house effects** (±14-21 days) to detect systematic polling biases
- Identifies which polling houses consistently over/underestimate each party

### Phase 2: Bias Correction & Averaging  
- **Applies house effect corrections** to remove systematic biases
- Generates **time-series polling averages** with configurable windows
- Maintains original data alongside corrected results for transparency

### Phase 3: Professional Visualization
- **ASCII charts** for terminal display
- **PNG chart export** using Chart.js and @napi-rs/canvas
- Norwegian party colors and professional formatting

## 📈 Current Results (House-Adjusted)

**14-day Average (as of 22/8-2025):**
- **Ap (Labour):** 26.7% 
- **Frp (Progress):** 21.8%
- **Høyre (Conservative):** 15.1%
- **SV (Socialist Left):** 6.1%
- **Rødt (Red):** 6.2%
- **Sp (Centre):** 6.1%

*Based on 8 polls from 6 houses: InFact, Norfakta, Norstat, Opinion, Respons, Verian*

## 🔧 Installation & Setup

```bash
# Clone repository
git clone <repository-url>
cd valg2025

# Install dependencies (uses pnpm)
pnpm install

# Verify installation
npx tsx generate_chart.ts --help
```

### System Requirements
- Node.js 18+
- pnpm package manager
- macOS/Linux (for @napi-rs/canvas native dependencies)

## 📁 Project Structure

```
valg2025/
├── generate_chart.ts          # 🎯 MAIN SCRIPT - Chart generator
├── polls.csv                  # Raw Norwegian polling data
├── src/
│   ├── visualization.ts       # Chart generation & ASCII output
│   ├── houseEffects.ts       # Rolling window bias calculation
│   ├── houseEffectAdjustment.ts # Apply corrections to polls
│   ├── pollingAverages.ts    # Time-series averages
│   ├── dataParser.ts         # Norwegian CSV parsing
│   ├── analysis.ts           # High-level orchestration
│   ├── types.ts              # TypeScript definitions
│   └── *.test.ts             # Comprehensive test suites
├── CLAUDE.md                 # Development documentation
└── package.json              # Dependencies & scripts
```

## 🧪 Development & Testing

```bash
# Generate charts
pnpm chart [days] [filename]  # Main chart generation command

# Run tests
pnpm test:run                  # Run once
pnpm test                     # Watch mode
pnpm test:ui                  # Visual test runner

# Type checking
npx tsc --noEmit

# Data cleaning (if needed)
pnpm clean-data
```

## 📊 Data Format

The system processes Norwegian polling data with:
- **Delimiter:** Semicolon (`;`)
- **Date format:** DD/M-YYYY (e.g., "22/8-2025")
- **Percentages:** "26,7 (50)" format (percentage + seat count)
- **Houses:** "POLLING_HOUSE / NEWSPAPER" format
- **Parties:** Ap, Høyre, Frp, SV, Sp, KrF, Venstre, MDG, Rødt, Andre

**Current dataset:** 27 polls from May-August 2025 across 6 polling organizations.

## 🎨 Chart Customization

The chart generator supports:

```bash
# Different time periods using pnpm script
pnpm chart 7                    # Weekly snapshot
pnpm chart 14                   # Bi-weekly (default)  
pnpm chart 21                   # Monthly view

# Custom output files with organized structure
pnpm chart 7 charts/weekly-report.png
pnpm chart 14 charts/current-standings.png
pnpm chart 21 charts/monthly-analysis.png
```

**Chart features:**
- **Norwegian party colors:** Accurate political branding
- **House effect corrections:** All systematic biases removed
- **Professional formatting:** Ready for publication/presentation
- **Data labels:** Exact percentages displayed on bars
- **Temporal accuracy:** Rolling windows prevent month-boundary artifacts

## 🏠 House Effects Detected

The system identifies systematic biases in Norwegian polling houses:

- **Verian:** Overestimates Ap by +1.87pts, underestimates Frp by -0.62pts
- **Norstat:** Strong positive bias for Ap (+0.91pts)
- **Opinion:** Underestimates Ap (-0.73pts), high Andre bias (+1.10pts)
- **InFact:** Underestimates Ap (-0.69pts) and Høyre (-0.53pts)
- **Norfakta:** Major Frp underestimation (-1.52pts), Høyre overestimation (+0.80pts)
- **Respons:** Negative Ap bias (-0.72pts), positive SV (+0.54pts) and Venstre (+0.58pts)

*All corrections are automatically applied in chart output.*

## 📚 API Usage

For programmatic use:

```typescript
import { 
    analyzeNorwegianPolls, 
    getCurrentStandings, 
    generateStandingsBarChart,
    saveStandingsChart 
} from './src/index';

// Load and analyze data
const csvContent = readFileSync('./polls.csv', 'utf8');
const analysis = analyzeNorwegianPolls(csvContent, { 
    includeAdjustments: true 
});

// Generate current standings
const standings = getCurrentStandings(analysis.adjustedPolls!, 14);

// Export chart
await saveStandingsChart(standings!, 'my-chart.png');
```

## 🤝 Contributing

This project uses:
- **TypeScript** with strict typing
- **Vitest** for testing  
- **Biome** for linting/formatting
- **pnpm** for package management

The codebase assumes data validity (will hard crash on invalid data by design).

## 📄 License

ISC License

---

**🎯 TL;DR: Run `pnpm chart` to get professional Norwegian election polling charts with house effect corrections applied!**