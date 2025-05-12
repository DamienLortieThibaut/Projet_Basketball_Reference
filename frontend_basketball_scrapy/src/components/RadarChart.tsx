import { ResponsiveRadar } from '@nivo/radar'

interface RadarChartProps {
  data: any[]
  playerName: string
  playerColor: string
}

export default function RadarChart({ data, playerName, playerColor }: RadarChartProps) {
  return (
    <div style={{ width: '100%', height: 500 }}>
      <ResponsiveRadar
        data={data}
        keys={['player', 'league']}
        indexBy="stat"
        maxValue={100}
        margin={{ top: 70, right: 80, bottom: 40, left: 80 }}
        borderColor={{ from: 'color' }}
        gridLabelOffset={36}
        dotSize={10}
        dotColor={{ theme: 'background' }}
        dotBorderWidth={2}
        colors={[playerColor, '#8884d8']}
        blendMode="multiply"
        motionConfig="gentle"
        valueFormat=".1f"
        legends={[
          {
            anchor: 'top-left',
            direction: 'column',
            translateX: -50,
            translateY: -40,
            itemWidth: 80,
            itemHeight: 20,
            itemTextColor: '#999',
            symbolSize: 12,
            symbolShape: 'circle',
            effects: [
              {
                on: 'hover',
                style: {
                  itemTextColor: '#000'
                }
              }
            ]
          }
        ]}
        theme={{
          background: '#ffffff',
          text: {
            fontSize: 11,
            fill: '#333333',
            outlineWidth: 0,
            outlineColor: 'transparent',
          },
          axis: {
            domain: {
              line: {
                stroke: '#777777',
                strokeWidth: 1
              }
            },
            legend: {
              text: {
                fontSize: 12,
                fill: '#333333',
                outlineWidth: 0,
                outlineColor: 'transparent',
              }
            },
            ticks: {
              line: {
                stroke: '#777777',
                strokeWidth: 1
              },
              text: {
                fontSize: 11,
                fill: '#333333',
                outlineWidth: 0,
                outlineColor: 'transparent',
              }
            }
          },
          grid: {
            line: {
              stroke: '#dddddd',
              strokeWidth: 1
            }
          },
          legends: {
            title: {
              text: {
                fontSize: 11,
                fill: '#333333',
                outlineWidth: 0,
                outlineColor: 'transparent',
              }
            },
            text: {
              fontSize: 11,
              fill: '#333333',
              outlineWidth: 0,
              outlineColor: 'transparent',
            },
            ticks: {
              line: {},
              text: {
                fontSize: 10,
                fill: '#333333',
                outlineWidth: 0,
                outlineColor: 'transparent',
              }
            }
          },
          annotations: {
            text: {
              fontSize: 13,
              fill: '#333333',
              outlineWidth: 2,
              outlineColor: '#ffffff',
              outlineOpacity: 1
            },
            link: {
              stroke: '#000000',
              strokeWidth: 1,
              outlineWidth: 2,
              outlineColor: '#ffffff',
              outlineOpacity: 1
            },
            outline: {
              stroke: '#000000',
              strokeWidth: 2,
              outlineWidth: 2,
              outlineColor: '#ffffff',
              outlineOpacity: 1
            },
            symbol: {
              fill: '#000000',
              outlineWidth: 2,
              outlineColor: '#ffffff',
              outlineOpacity: 1
            }
          },
          tooltip: {
            container: {
              background: '#ffffff',
              color: '#333333',
              fontSize: 12
            }
          }
        }}
      />
    </div>
  )
} 