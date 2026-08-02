/**
 * Format large monetary values into clean Indian shorthand (K/L/Cr).
 * Example: 1000 -> ₹1K, 100000 -> ₹1L, 10000000 -> ₹1Cr.
 */
export const formatMonetary = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  const num = Number(val);
  const sign = num < 0 ? '-' : '';
  const absNum = Math.abs(num);

  if (absNum >= 10000000) { // 1 Crore = 100 Lakhs
    const cr = absNum / 10000000;
    return `${sign}₹${Number(cr.toFixed(2))}Cr`;
  }
  if (absNum >= 100000) { // 1 Lakh = 100 Thousands
    const lakh = absNum / 100000;
    return `${sign}₹${Number(lakh.toFixed(2))}L`;
  }
  if (absNum >= 1000) { // 1 Thousand
    const k = absNum / 1000;
    return `${sign}₹${Number(k.toFixed(2))}K`;
  }
  return `${sign}₹${absNum}`;
};

/**
 * Parses date labels and outputs a full formatted representation.
 * Handles both hourly string labels ("07 AM") and date labels.
 */
export const formatFullDate = (label) => {
  if (!label) return '';
  
  // Check if it matches hourly pattern e.g. "07 AM", "12 PM"
  if (/^\d+\s*(AM|PM)$/i.test(label)) {
    return `Time Window: ${label}`;
  }

  const parsed = Date.parse(label);
  if (isNaN(parsed)) {
    // Attempt parse by appending the current year if it's like "Jun 12"
    const withYear = `${label}, ${new Date().getFullYear()}`;
    const parsedWithYear = Date.parse(withYear);
    if (!isNaN(parsedWithYear)) {
      return new Date(parsedWithYear).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    return label;
  }

  return new Date(parsed).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Parse standard or database date values to output concise "Month Day" representations (e.g. Jun 12).
 */
export const formatConciseDate = (label) => {
  if (!label) return '';
  const parsed = Date.parse(label);
  if (isNaN(parsed)) {
    return label;
  }
  const d = new Date(parsed);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[d.getMonth()]} ${d.getDate()}`;
};

/**
 * Formats standard ranges or custom ranges to match format: "01 May 2026 - 29 Jul 2026 (90 Days)"
 */
export const getSelectedRangeLabel = (rangeType, fDate, tDate) => {
  let start, end;
  const today = new Date();
  
  if (rangeType === 'daily') {
    start = today;
    end = today;
  } else if (rangeType === 'weekly') {
    start = new Date();
    start.setDate(today.getDate() - 6);
    end = today;
  } else if (rangeType === 'monthly') {
    start = new Date();
    start.setDate(today.getDate() - 29);
    end = today;
  } else if (rangeType === 'custom') {
    if (!fDate || !tDate) return '';
    start = new Date(fDate);
    end = new Date(tDate);
  }

  if (!start || isNaN(start.getTime()) || !end || isNaN(end.getTime())) {
    return '';
  }

  const formatDateStr = (d) => {
    const day = String(d.getDate()).padStart(2, '0');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${day} ${month} ${year}`;
  };

  // Set hours to midnight to compare exact days
  const startCopy = new Date(start);
  const endCopy = new Date(end);
  startCopy.setHours(0,0,0,0);
  endCopy.setHours(0,0,0,0);

  const diffTime = Math.abs(endCopy - startCopy);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const dayLabel = diffDays === 1 ? '1 Day' : `${diffDays} Days`;

  return `${formatDateStr(start)} - ${formatDateStr(end)} (${dayLabel})`;
};

/**
 * Generate a smooth cubic Bezier path for line charts from coordinate points.
 * Monotone cubic interpolation handles line smoothing while maintaining high data accuracy.
 */
export const getBezierPath = (points) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  
  let d = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Horizontal control offsets
    const dx = p1.x - p0.x;
    const cpX1 = p0.x + dx / 3;
    const cpY1 = p0.y;
    const cpX2 = p0.x + (2 * dx) / 3;
    const cpY2 = p1.y;
    
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  
  return d;
};

/**
 * Formats a Date object to YYYY-MM-DD in the local browser timezone.
 * @param {Date} date
 * @returns {string} YYYY-MM-DD
 */
export const formatLocalDate = (date) => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

/**
 * Gets today's date in local browser timezone as a YYYY-MM-DD string.
 * @returns {string} YYYY-MM-DD
 */
export const getTodayDateString = () => formatLocalDate(new Date());
