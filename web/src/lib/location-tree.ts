import { useListLocations } from '#/api/locations/locations'
import type { LocationResponse } from '#/api/model'
import { formatAddress } from '#/lib/address'
import { ALL_LIFECYCLE_STATUSES } from '#/lib/lifecycle'
import type { LifecycleStatus } from '#/lib/lifecycle'

export interface LocationNode {
  location: LocationResponse
  children: LocationNode[]
}

/** One rendered line: a location, how far to indent it, and why it is here. */
export interface LocationTreeRow {
  location: LocationResponse
  depth: number
  /**
   * False when the row itself was filtered out and is only on screen to keep a
   * descendant that wasn't reachable. Render those as context: dimmed, but not
   * hidden, so the hierarchy never has a hole in the middle of it.
   */
  isMatch: boolean
  /** Whether this row has children to disclose, after filtering. */
  hasChildren: boolean
  /** Whether those children are currently folded away. */
  isCollapsed: boolean
}

export interface LocationTreeOptions {
  statuses: LifecycleStatus[]
  /** Free text matched against name and address. Empty matches everything. */
  query?: string
  /** Ids whose children are folded away. Ignored while searching. */
  collapsed?: ReadonlySet<string>
}

// Groups the flat list into roots and children, siblings by name.
export function buildLocationTree(
  locations: readonly LocationResponse[],
): LocationNode[] {
  const nodes = new Map<string, LocationNode>()
  for (const location of locations) {
    nodes.set(location.id, { location, children: [] })
  }

  const roots: LocationNode[] = []
  for (const node of nodes.values()) {
    const parent = node.location.parentId
      ? nodes.get(node.location.parentId)
      : undefined

    if (parent && parent !== node) parent.children.push(node)
    else roots.push(node)
  }

  sortNodes(roots)

  return roots
}

function sortNodes(nodes: LocationNode[]) {
  nodes.sort((a, b) =>
    a.location.name.localeCompare(b.location.name, undefined, {
      numeric: true,
      sensitivity: 'base',
    }),
  )

  for (const node of nodes) sortNodes(node.children)
}

/**
 * Walks the tree into the flat, parents-first list the table and the select
 * both render, keeping a location that does not match itself whenever
 * something below it does.
 */
export function flattenLocationTree(
  roots: readonly LocationNode[],
  options: LocationTreeOptions,
): LocationTreeRow[] {
  const query = normalize(options.query ?? '')
  const collapsed = query ? undefined : options.collapsed
  const statuses = new Set<string>(options.statuses)

  const rows: LocationTreeRow[] = []

  const seen = new Set<string>()

  function walk(node: LocationNode, depth: number): boolean {
    if (seen.has(node.location.id)) return false
    seen.add(node.location.id)

    const isMatch =
      statuses.has(node.location.status) && matchesQuery(node.location, query)

    const at = rows.length
    rows.push({
      location: node.location,
      depth,
      isMatch,
      hasChildren: false,
      isCollapsed: false,
    })

    let kept = 0
    for (const child of node.children) {
      if (walk(child, depth + 1)) kept++
    }

    if (!isMatch && kept === 0) {
      rows.length = at
      return false
    }

    const isCollapsed = kept > 0 && (collapsed?.has(node.location.id) ?? false)
    rows[at] = { ...rows[at], hasChildren: kept > 0, isCollapsed }

    if (isCollapsed) rows.length = at + 1

    return true
  }

  for (const root of roots) walk(root, 0)

  return rows
}

/** The subtree under one location, its own row left out. */
export function descendantsOf(
  roots: readonly LocationNode[],
  id: string,
  options: LocationTreeOptions,
): LocationTreeRow[] {
  const node = findNode(roots, id)
  if (!node) return []

  return flattenLocationTree(node.children, options)
}

function findNode(
  nodes: readonly LocationNode[],
  id: string,
): LocationNode | undefined {
  for (const node of nodes) {
    if (node.location.id === id) return node

    const found = findNode(node.children, id)
    if (found) return found
  }

  return undefined
}

function matchesQuery(location: LocationResponse, query: string): boolean {
  if (!query) return true

  return (
    normalize(location.name).includes(query) ||
    normalize(formatAddress(location.address)).includes(query)
  )
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
}

export function useAllLocations() {
  return useListLocations({ status: ALL_LIFECYCLE_STATUSES })
}
