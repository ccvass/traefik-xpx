import { getCategoryColors, getStatusColors, badgeStyle, dotStyle } from '@/lib/design'

export function TypeBadge({ type }: { type: string }) {
  return <span style={badgeStyle(getCategoryColors(type))}>{type}</span>
}

export function StatusBadge({ status }: { status: string }) {
  return <span style={badgeStyle(getStatusColors(status))}>{status}</span>
}

export function StatusDot({ status }: { status: string }) {
  return <span style={dotStyle(getStatusColors(status).accent)} />
}

export function getTypeColor(type: string): string {
  return getCategoryColors(type).accent
}
