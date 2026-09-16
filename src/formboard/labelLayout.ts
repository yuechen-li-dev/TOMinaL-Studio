import { resolveLayoutRows, type Rect } from 'machinalayout';
import { M } from 'machinalayout/machina';

import type { RouteId } from '@/harness-core';
import type { FormboardDocument } from './model';
import { getRouteLength } from './metrics';

export type RouteLengthCallout = {
  readonly routeId: RouteId;
  readonly text: string;
  readonly rect: Rect;
};

const CALLOUT_ROW_HEIGHT_MM = 14;
const CALLOUT_RAIL_X_MM = 20;
const CALLOUT_RAIL_TOP_MM = 14;
const CALLOUT_RAIL_GAP_MM = 5;
const CALLOUT_ITEM_GAP_MM = 5;

function resolveCalloutRow(
  document: FormboardDocument,
  routes: readonly FormboardDocument['routes'][number][],
  rowIndex: number
): RouteLengthCallout[] {
  if (routes.length === 0) return [];
  const railWidth = Math.max(0, Number(document.board.widthMm) - CALLOUT_RAIL_X_MM * 2);
  const root = M.root(
    `route-callout-row-${rowIndex}`,
    {
      arrange: M.stackArrange('horizontal', {
        gap: CALLOUT_ITEM_GAP_MM,
        justify: 'space-between',
        align: 'center'
      })
    },
    routes.map((route) => M.fill(`route-callout-${route.routeId}`, 1, { cross: 12 }))
  );
  const rowY = CALLOUT_RAIL_TOP_MM + rowIndex * (CALLOUT_ROW_HEIGHT_MM + CALLOUT_RAIL_GAP_MM);
  const layout = resolveLayoutRows(root.rows(), {
    x: CALLOUT_RAIL_X_MM,
    y: rowY,
    width: railWidth,
    height: CALLOUT_ROW_HEIGHT_MM
  });
  return routes.map((route) => {
    const length = getRouteLength(document, route.routeId);
    return {
      routeId: route.routeId,
      text: length.status === 'resolved'
        ? `${route.routeId} · ${Number(length.valueMm).toFixed(1)} mm`
        : `${route.routeId} · UNRESOLVED`,
      rect: layout.nodes[`route-callout-${route.routeId}`].rect
    };
  });
}

/**
 * Uses two MachinaLayout horizontal stacks in the reserved top drawing margin.
 * The split is deterministic and keeps every route label in a non-overlapping cell.
 */
export function layoutRouteLengthCallouts(document: FormboardDocument): readonly RouteLengthCallout[] {
  const routes = [...document.routes].sort((left, right) => left.routeId.localeCompare(right.routeId));
  const firstRowCount = Math.ceil(routes.length / 2);
  return [
    ...resolveCalloutRow(document, routes.slice(0, firstRowCount), 0),
    ...resolveCalloutRow(document, routes.slice(firstRowCount), 1)
  ];
}

