# Income vs. Poverty

## Overview

This project features an interactive D3.js that looks at how median household income relates to poverty rates across
U.S. states, using American Community Survey (ACS) 5-Year Estimates from 2010 to 2023. The users will follow economic
patterns over time through an animated timeline, a hover tooltip with state-level details, and a flexible **Size by**
option that can draw attention to differences in poverty and education. This tool makes it easier to explore the data
and spot how shifts in income and levels of educational attainment connect to poverty across regions and years.

---

## Easy quick access to website

# [Click Here](https://mpate1001.github.io/us-income-poverty-trends/)

## How to Load and Run the Project Locally

1. Ensure all files are in the same directory:
    - `index.html`
    - `styles.css`
    - `script.js`
2. Open `index.html` in any modern browser (Chrome, Edge, Safari, or Firefox).
3. Wait a few seconds for the ACS data to load.
4. Use the interface to explore:
    - **Year slider** – move manually or press **Play** to animate changes over time.
    - **Size by** dropdown – select a variable (e.g., *Poverty Rate* or *Education %*) to resize dots proportionally.
    - **Hover** over points – view a tooltip with detailed values for each state and year.
    - **Click** on a dot – pauses playback for focused inspection.

---

## Dataset

- **Data:
  ** [U.S. Census Bureau - (ACS) 5-Year Estimates](https://www.census.gov/data/developers/data-sets/acs-5year.html)
- **Variables used:**
    - `B19013_001E` – Median household income (USD)
    - `B17001_002E` – Population below poverty level
    - `B17001_001E` – Total population for poverty universe
    - `B15003_*` – Educational attainment (Bachelor’s degree and higher)

### ***For 2010–2011, education data is unavailable in the API, so those years display income and poverty only.***

## Key Interactions

### Details

When hovering over any state dot, a tooltip appears showing:

- State name
- Year
- Median household income
- Poverty rate
- Bachelor’s degree or higher (%)

This interaction supports *focused exploration* readers can directly inspect specific states of interest.

**Example:**

- If you hover over **Puerto Rico**, you'll see it ranks among the lowest in median income and among the highest in
  poverty. That pattern lines up with the idea that as income goes down, poverty tends to go up.
- If you hover over **Washing DC**, you'll see it ranks highest in education %.

### Data Encoding

The **Size by** dropdown lets users change how the chart is encoded, so the circles grow or shrink based on the variable
they pick:

- *Poverty Rate (%)* – Larger circles highlight states with higher poverty.
- *Education (%)* – Larger circles emphasize more highly educated states.

By switching the encoding, people can look at different sides of prosperity while keeping the same dataset untouched.
This small change lets them see patterns in new ways, maybe through color or size, without changing the data itself.

**Purpose:**  
This interaction highlights how structural factors (like education) relate to economic outcomes across states.

### Design

This visualization was intentionally designed with simplicity and clarity:

- **Scatterplot** chosen to emphasize correlation between income and poverty.
- **Blue color palette** maintains consistency and readability.
- **Size encoding** adds a third dimension of data while minimizing clutter.
- **Animation and hover details** make the exploration intuitive, even for non-technical audiences.

---

### Technical Notes

- Built with **D3.js**.
- Fetches live data from the **U.S. Census Bureau API**.

### Credits

- **Developer:** Mahek Patel
- **Course:** DATA 760
- **Assignment:** Interactive Design
