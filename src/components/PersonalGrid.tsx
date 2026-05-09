"use client";

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
// react-grid-layout uses `export =` (CommonJS) — use require to avoid TypeScript named-import conflict
// eslint-disable-next-line @typescript-eslint/no-require-imports
const RGL = require("react-grid-layout") as {
  default: unknown;
  Responsive: React.ComponentType<RGLResponsiveProps>;
  WidthProvider: <P>(component: React.ComponentType<P>) => React.ComponentClass<P>;
};

import React from "react";

type Layout = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
  isDraggable?: boolean;
  isResizable?: boolean;
};
type Layouts = { [breakpoint: string]: Layout[] };

interface RGLResponsiveProps {
  className?: string;
  layouts?: Layouts;
  breakpoints?: { [key: string]: number };
  cols?: { [key: string]: number };
  rowHeight?: number;
  draggableHandle?: string;
  onLayoutChange?: (currentLayout: Layout[], allLayouts: Layouts) => void;
  margin?: [number, number];
  containerPadding?: [number, number];
  resizeHandles?: string[];
  style?: React.CSSProperties;
  children?: ReactNode;
}

const ResponsiveGridLayout = RGL.WidthProvider(RGL.Responsive);

const STORAGE_KEY = "personal-grid-layout";
const ROW_HEIGHT = 60; // px per row unit

// Breakpoints are width-based (px). lg = wide/landscape, md + sm = narrower/portrait.
const BREAKPOINTS = { lg: 1200, md: 800, sm: 0 };
const COLS = { lg: 12, md: 8, sm: 8 };

// 12-col landscape layout — fits in ~11 rows (660px + margins ≈ viewport height)
const LANDSCAPE_LAYOUT: Layout[] = [
  { i: "weather",   x: 0,  y: 0, w: 2, h: 3, minW: 2, minH: 2 },
  { i: "ai-advice", x: 2,  y: 0, w: 4, h: 3, minW: 2, minH: 2 },
  { i: "daily-sum", x: 6,  y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: "tasks",     x: 9,  y: 0, w: 3, h: 3, minW: 2, minH: 2 },
  { i: "calendar",  x: 0,  y: 3, w: 4, h: 5, minW: 2, minH: 3 },
  { i: "gmail",     x: 4,  y: 3, w: 4, h: 5, minW: 2, minH: 3 },
  { i: "whatsapp",  x: 8,  y: 3, w: 4, h: 5, minW: 2, minH: 3 },
  { i: "notes",     x: 0,  y: 8, w: 6, h: 3, minW: 2, minH: 2 },
  { i: "habits",    x: 6,  y: 8, w: 6, h: 3, minW: 2, minH: 2 },
];

// 8-col portrait/medium layout — scrollable stacking
const PORTRAIT_LAYOUT: Layout[] = [
  { i: "weather",   x: 0, y: 0,  w: 4, h: 3, minW: 2, minH: 2 },
  { i: "ai-advice", x: 4, y: 0,  w: 4, h: 3, minW: 2, minH: 2 },
  { i: "daily-sum", x: 0, y: 3,  w: 4, h: 3, minW: 2, minH: 2 },
  { i: "tasks",     x: 4, y: 3,  w: 4, h: 3, minW: 2, minH: 2 },
  { i: "calendar",  x: 0, y: 6,  w: 8, h: 5, minW: 2, minH: 3 },
  { i: "gmail",     x: 0, y: 11, w: 8, h: 5, minW: 2, minH: 3 },
  { i: "whatsapp",  x: 0, y: 16, w: 4, h: 4, minW: 2, minH: 3 },
  { i: "notes",     x: 4, y: 16, w: 4, h: 4, minW: 2, minH: 2 },
  { i: "habits",    x: 0, y: 20, w: 8, h: 3, minW: 2, minH: 2 },
];

const DEFAULT_LAYOUTS: Layouts = {
  lg: LANDSCAPE_LAYOUT,
  md: PORTRAIT_LAYOUT,
  sm: PORTRAIT_LAYOUT,
};

function loadLayouts(): Layouts {
  if (typeof window === "undefined") return DEFAULT_LAYOUTS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved) as Layouts;
  } catch {
    /* ignore parse errors */
  }
  return DEFAULT_LAYOUTS;
}

interface Props {
  children: ReactNode;
  widgetIds: string[];
}

export function PersonalGrid({ children, widgetIds }: Props) {
  const [layouts, setLayouts] = useState<Layouts>(DEFAULT_LAYOUTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setLayouts(loadLayouts());
    setMounted(true);
  }, []);

  const handleLayoutChange = useCallback(
    (_: Layout[], allLayouts: Layouts) => {
      setLayouts(allLayouts);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allLayouts));
      } catch {
        /* ignore quota errors */
      }
    },
    []
  );

  const childArray = Array.isArray(children) ? children : [children];

  // SSR / first-paint fallback — avoids layout shift before WidthProvider measures
  if (!mounted) {
    return (
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 10,
          padding: 10,
          height: "100%",
          alignContent: "flex-start",
        }}
      >
        {childArray.map((child, i) => (
          <div
            key={widgetIds[i] ?? i}
            style={{ flex: "1 1 280px", minHeight: 200 }}
          >
            {child}
          </div>
        ))}
      </div>
    );
  }

  return (
    <ResponsiveGridLayout
      className="personal-rgl"
      layouts={layouts}
      breakpoints={BREAKPOINTS}
      cols={COLS}
      rowHeight={ROW_HEIGHT}
      draggableHandle=".widget-drag-handle"
      onLayoutChange={handleLayoutChange}
      margin={[10, 10]}
      containerPadding={[10, 10]}
      resizeHandles={["se"]}
      style={{ minHeight: "100%" }}
    >
      {childArray.map((child, i) => (
        <div key={widgetIds[i] ?? i} className="rgl-item">
          {child}
        </div>
      ))}
    </ResponsiveGridLayout>
  );
}