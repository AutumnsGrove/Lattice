<script>
  /**
   * Sparkline - A simple SVG sparkline chart
   * Shows activity trend over time (commits, LOC, etc.)
   */

  /**
   * @typedef {Object} SparklineProps
   * @property {number[]} [data] - Data points for the sparkline
   * @property {number} [width] - Width of the chart
   * @property {number} [height] - Height of the chart
   * @property {string} [strokeColor] - Line color
   * @property {string} [fillColor] - Fill color for area
   * @property {number} [strokeWidth] - Line thickness
   * @property {boolean} [showDots] - Show data point dots
   * @property {boolean} [showArea] - Show filled area
   */

  let {
    data = /** @type {number[]} */ ([]),
    width = 120,
    height = 24,
    strokeColor = '#5cb85f',
    fillColor = 'rgba(92, 184, 95, 0.1)',
    strokeWidth = 1.5,
    showDots = false,
    showArea = true
  } = $props();

  // Calculate the path for the sparkline
  function getPath() {
    if (!data || data.length < 2) return '';

    const max = Math.max(...data, 1); // Ensure at least 1 to avoid division by zero
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((/** @type {number} */ value, /** @type {number} */ i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2; // 2px padding
      return { x, y };
    });

    // Create line path
    const linePath = points.map((/** @type {{ x: number, y: number }} */ p, /** @type {number} */ i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    return linePath;
  }

  function getAreaPath() {
    if (!data || data.length < 2) return '';

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((/** @type {number} */ value, /** @type {number} */ i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return { x, y };
    });

    // Create closed area path
    const linePath = points.map((/** @type {{ x: number, y: number }} */ p, /** @type {number} */ i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  }

  function getDots() {
    if (!data || data.length < 2) return [];

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    return data.map((/** @type {number} */ value, /** @type {number} */ i) => ({
      x: (i / (data.length - 1)) * width,
      y: height - ((value - min) / range) * (height - 4) - 2,
      value
    }));
  }

  const linePath = $derived(getPath());
  const areaPath = $derived(getAreaPath());
  const dots = $derived(getDots());
</script>

<svg
  class="sparkline"
  viewBox="0 0 {width} {height}"
  width={width}
  height={height}
  role="img"
  aria-label="Sparkline chart"
>
  {#if showArea && areaPath}
    <path
      d={areaPath}
      fill={fillColor}
      class="sparkline-area"
    />
  {/if}

  {#if linePath}
    <path
      d={linePath}
      fill="none"
      stroke={strokeColor}
      stroke-width={strokeWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      class="sparkline-line"
    />
  {/if}

  {#if showDots && dots.length > 0}
    {#each dots as dot}
      <circle
        cx={dot.x}
        cy={dot.y}
        r={2}
        fill={strokeColor}
        class="sparkline-dot"
      />
    {/each}
  {/if}
</svg>

<style>
  .sparkline {
    display: inline-block;
    vertical-align: middle;
  }

  .sparkline-line {
    transition: stroke 0.2s ease;
  }

  .sparkline-area {
    transition: fill 0.2s ease;
  }

  .sparkline-dot {
    transition: fill 0.2s ease;
  }
</style>
