declare module 'recharts' {
  import { ComponentType } from 'react'

  export const BarChart: ComponentType<any>
  export const Bar: ComponentType<any>
  export const XAxis: ComponentType<any>
  export const YAxis: ComponentType<any>
  export const CartesianGrid: ComponentType<any>
  export const Tooltip: ComponentType<any>
  export const ResponsiveContainer: ComponentType<any>
  export const PieChart: ComponentType<any>
  export const Pie: ComponentType<any>
  export const Cell: ComponentType<any>
  export const ScatterChart: ComponentType<any>
  export const Scatter: ComponentType<any>
  export const ZAxis: ComponentType<any>
  export const Legend: ComponentType<any>

  export interface PieLabelRenderProps {
    name: string
    percent?: number
    value: number
  }

  export interface TooltipProps {
    payload?: Array<{
      payload: {
        name: string
        minutes: number
        points: number
        clutchScore: number
      }
    }>
    }
} 