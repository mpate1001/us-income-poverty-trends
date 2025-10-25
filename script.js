// Config
const YEARS = d3.range(2010, 2024);
const acsVars = ['NAME', 'B19013_001E', 'B17001_002E', 'B17001_001E'];
const acsEduVars = ['B15003_001E', 'B15003_022E', 'B15003_023E', 'B15003_024E', 'B15003_025E'];

const numFormatUSD = d3.format(",.0f");
const numFormatPCT = d3.format(".1f");

function urlFor(year, vars) {
    return `https://api.census.gov/data/${year}/acs/acs5?get=${vars.join(',')}&for=state:*`;
}

// Data fetching
async function fetchYear(year) {
    // Base (income + poverty)
    const baseRes = await fetch(urlFor(year, acsVars));
    if (!baseRes.ok) throw new Error(`Base fetch ${year}: HTTP ${baseRes.status}`);
    const baseRaw = await baseRes.json();
    const [baseHeader, ...baseRows] = baseRaw;
    const bIdx = Object.fromEntries(baseHeader.map((h, i) => [h, i]));

    const byFips = new Map();
    for (const r of baseRows) {
        const fips = r[bIdx.state];
        const name = r[bIdx.NAME];
        const income = +r[bIdx.B19013_001E];
        const povNum = +r[bIdx.B17001_002E];
        const povDen = +r[bIdx.B17001_001E];
        const povertyRate = povDen > 0 ? (povNum / povDen) * 100 : NaN;
        byFips.set(fips, {year, name, fips, income, povertyRate, eduPct: NaN});
    }

    // Education not available in 2010–2011 (skip to avoid 400s)
    if (year >= 2012) {
        try {
            const eduRes = await fetch(urlFor(year, acsEduVars));
            if (eduRes.ok) {
                const eduRaw = await eduRes.json();
                const [eHeader, ...eRows] = eduRaw;
                const eIdx = Object.fromEntries(eHeader.map((h, i) => [h, i]));
                for (const r of eRows) {
                    const fips = r[eIdx.state];
                    const den = +r[eIdx.B15003_001E];
                    const ba = +r[eIdx.B15003_022E];
                    const ma = +r[eIdx.B15003_023E];
                    const prof = +r[eIdx.B15003_024E];
                    const phd = +r[eIdx.B15003_025E];
                    const eduPct = den > 0 ? ((ba + ma + prof + phd) / den) * 100 : NaN;
                    const obj = byFips.get(fips);
                    if (obj) obj.eduPct = eduPct;
                }
            }
        } catch (_) {
            // ignore; education is optional
        }
    }

    return Array.from(byFips.values())
        .filter(d => Number.isFinite(d.income) && Number.isFinite(d.povertyRate));
}

function rollupByState(rows) {
    const byState = new Map();
    for (const d of rows) {
        if (!byState.has(d.fips)) byState.set(d.fips, {fips: d.fips, name: d.name, series: []});
        byState.get(d.fips).series.push({year: d.year, income: d.income, povertyRate: d.povertyRate, eduPct: d.eduPct});
    }
    for (const s of byState.values()) s.series.sort((a, b) => d3.ascending(a.year, b.year));
    return byState;
}

// Viz setup
const svg = d3.select('#chart');
const width = 1040, height = 520, margin = {top: 24, right: 24, bottom: 80, left: 72};
svg.attr('viewBox', [0, 0, width, height]);
const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
const iw = width - margin.left - margin.right;
const ih = height - margin.top - margin.bottom;

const gx = g.append('g').attr('class', 'axis').attr('transform', `translate(0,${ih})`);
const gy = g.append('g').attr('class', 'axis');
const grid = g.append('g').attr('class', 'grid');
const dotsG = g.append('g');

svg.append('text')
    .attr('x', margin.left + iw / 2)
    .attr('y', height - 10)
    .attr('text-anchor', 'middle')
    .attr('fill', '#000')
    .style('font-size', '24px')
    .text('Median household income (USD)');

svg.append('text')
    .attr('transform', `translate(18, ${margin.top + ih / 2}) rotate(-90)`)
    .attr('text-anchor', 'middle')
    .attr('fill', '#000')
    .style('font-size', '24px')
    .text('Poverty rate (%)');

const tooltip = d3.select('#tooltip');

let x = d3.scaleLinear();
let y = d3.scaleLinear();
let sizeScale = d3.scaleSqrt().range([3, 10]);

let BY_STATE = new Map();
let ALL_ROWS = [];
let YEAR = 2010;
let playing = false, timer = null;

// Axes/grid
function computeDomains() {
    const incomes = ALL_ROWS.map(d => d.income).filter(Number.isFinite);
    const povs = ALL_ROWS.map(d => d.povertyRate).filter(Number.isFinite);
    if (!incomes.length || !povs.length) return;

    const MIN_TICK = 10000;
    const maxIncome = d3.max(incomes);
    const maxTick = Math.max(110000, Math.ceil(maxIncome / 10000) * 10000);
    const tickVals = d3.range(MIN_TICK, maxTick + 1, 10000);

    x.domain([MIN_TICK, maxTick]).range([0, iw]);
    const maxPov = Math.max(30, Math.ceil(d3.max(povs) / 5) * 5);
    y.domain([0, maxPov]).range([ih, 0]).nice();

    gx.call(d3.axisBottom(x).tickValues(tickVals).tickFormat(d => `$${numFormatUSD(d)}`));
    gy.call(d3.axisLeft(y).ticks(Math.min(10, maxPov / 5)).tickFormat(d => `${d}%`));

    grid.selectAll('g').remove();
    grid.append('g')
        .attr('transform', `translate(0,${ih})`)
        .call(d3.axisBottom(x).tickValues(tickVals).tickSize(-ih).tickFormat(''));
    grid.append('g')
        .call(d3.axisLeft(y).ticks(Math.min(10, maxPov / 5)).tickSize(-iw).tickFormat(''));
}

// Helpers
function dataForYear(year) {
    return Array.from(BY_STATE.values())
        .map(s => {
            const d = s.series.find(d => d.year === year);
            return d ? {fips: s.fips, name: s.name, year, ...d} : null;
        })
        .filter(Boolean);
}

function showTooltip(event, d) {
    const eduLine = Number.isFinite(d.eduPct)
        ? `<div><span class='t'>Bachelor's+:</span> ${numFormatPCT(d.eduPct)}%</div>`
        : '';
    const html = `
    <div><strong>${d.name}</strong> · <span class="t">${d.year}</span></div>
    <div><span class="t">Median income:</span> $${numFormatUSD(d.income)}</div>
    <div><span class="t">Poverty rate:</span> ${numFormatPCT(d.povertyRate)}%</div>
    ${eduLine}
  `;
    tooltip.html(html).style('opacity', 1);

    const [mx, my] = d3.pointer(event, document.getElementById('vis'));
    const vis = document.getElementById('vis').getBoundingClientRect();
    const tx = Math.min(Math.max(mx, 12), vis.width - 12);
    const ty = Math.min(Math.max(my, 12), vis.height - 12);
    tooltip.style('left', tx + 'px').style('top', ty + 'px');
}

function hideTooltip() {
    tooltip.style('opacity', 0);
}

function handleDotClick() {
    if (playing) {
        playing = false;
        clearInterval(timer);
        document.getElementById('play').textContent = '▶ Play';
    }
}

// Render
function render(year) {
    YEAR = year;
    d3.select('#year-label').text(year);

    const data = dataForYear(year);
    const sizeByDrownDown = document.getElementById('sizeBy');
    let sizeBy = sizeByDrownDown?.value || 'none';

    if (sizeBy !== 'none') {
        const vals = data.map(d => d[sizeBy]).filter(Number.isFinite);
        if (vals.length >= 2) sizeScale.domain(d3.extent(vals));
        else sizeBy = 'none';
    }

    const sel = dotsG.selectAll('circle.dot').data(data, d => d.fips);
    sel.join(
        enter => enter.append('circle')
            .attr('class', 'dot')
            .attr('cx', d => x(d.income))
            .attr('cy', d => y(d.povertyRate))
            .attr('r', d => sizeBy !== 'none' && Number.isFinite(d[sizeBy]) ? sizeScale(d[sizeBy]) : 5)
            .attr('fill', '#2b7cff')
            .on('mousemove', (event, d) => showTooltip(event, d))
            .on('mouseleave', hideTooltip)
            .on('click', handleDotClick),
        update => update.transition().duration(500)
            .attr('cx', d => x(d.income))
            .attr('cy', d => y(d.povertyRate))
            .attr('r', d => sizeBy !== 'none' && Number.isFinite(d[sizeBy]) ? sizeScale(d[sizeBy]) : 5)
            .attr('fill', '#2b7cff')
    );
}

// Controls
const yearSlider = document.getElementById('year');
const playButton = document.getElementById('play');
const sizeByDrownDown = document.getElementById('sizeBy');

yearSlider.addEventListener('input', e => render(+e.target.value));

playButton.addEventListener('click', () => {
    playing = !playing;
    playButton.textContent = playing ? '⏸ Pause' : '▶ Play';
    if (playing) {
        timer = setInterval(() => {
            let y = +yearSlider.value;
            y = (y >= +yearSlider.max) ? +yearSlider.min : y + 1;
            yearSlider.value = y;
            render(y);
        }, 900);
    } else {
        clearInterval(timer);
    }
});

sizeByDrownDown?.addEventListener('change', () => render(YEAR));

// Bootstrap
(async function init() {
    try {
        const results = await Promise.allSettled(YEARS.map(fetchYear));
        const perYear = results.map(r => r.status === 'fulfilled' ? r.value : []);
        ALL_ROWS = perYear.flat();
        BY_STATE = rollupByState(ALL_ROWS);
        computeDomains();
        render(2010);
    } catch (err) {
        console.error(err);
    }
})();