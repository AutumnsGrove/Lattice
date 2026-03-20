<script lang="ts">
  /**
   * Sparkline - A simple SVG sparkline chart
   * Shows activity trend over time (commits, LOC, etc.)
   */

  interface Props {
    data?: number[];
    width?: number;
    height?: number;
    strokeColor?: string;
    fillColor?: string;
    strokeWidth?: number;
    showDots?: boolean;
    showArea?: boolean;
  }

  let {
    data = [],
    width = 120,
    height = 24,
    strokeColor = 'var(--grove-accent)',
    fillColor = 'var(--grove-accent-10)',
    strokeWidth = 1.5,
    showDots = false,
    showArea = true
  }: Props = $props();

  // Calculate the path for the sparkline
  function getPath(): string {
    if (!data || data.length < 2) return '';

    const max = Math.max(...data, 1); // Ensure at least 1 to avoid division by zero
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2; // 2px padding
      return { x, y };
    });

    // Create line path
    const linePath = points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    return linePath;
  }

  function getAreaPath(): string {
    if (!data || data.length < 2) return '';

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((value, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((value - min) / range) * (height - 4) - 2;
      return { x, y };
    });

    // Create closed area path
    const linePath = points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    ).join(' ');

    return `${linePath} L ${width} ${height} L 0 ${height} Z`;
  }

  function getDots(): { x: number; y: number; value: number }[] {
    if (!data || data.length < 2) return [];

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    return data.map((value, i) => ({
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
