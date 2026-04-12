import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CHART_COLORS } from '../utils/constants';
import '../styles/Chart.css';

interface ChartProps<T extends object> {
  data: T[];
  type?: 'line' | 'area' | 'bar';
  dataKeys: { key: string; name: string; color?: string }[];
  xAxisKey: string;
  height?: number;
  title?: string;
  xAxisTickFormatter?: (value: string) => string;
  tooltipLabelFormatter?: (label: string) => string;
  xAxisAngle?: number;
  xAxisHeight?: number;
}

export const Chart = <T extends object>({
  data,
  type = 'line',
  dataKeys,
  xAxisKey,
  height = 300,
  title,
  xAxisTickFormatter,
  tooltipLabelFormatter,
  xAxisAngle = 0,
  xAxisHeight = 40,
}: ChartProps<T>) => {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={xAxisTickFormatter}
              angle={xAxisAngle}
              textAnchor={xAxisAngle === 0 ? 'middle' : 'end'}
              height={xAxisHeight}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend />
            {dataKeys.map((dk) => (
              <Area
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color || CHART_COLORS.temperature}
                fill={dk.color || CHART_COLORS.temperature}
                fillOpacity={0.6}
              />
            ))}
          </AreaChart>
        );

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={xAxisTickFormatter}
              angle={xAxisAngle}
              textAnchor={xAxisAngle === 0 ? 'middle' : 'end'}
              height={xAxisHeight}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend />
            {dataKeys.map((dk) => (
              <Bar
                key={dk.key}
                dataKey={dk.key}
                name={dk.name}
                fill={dk.color || CHART_COLORS.temperature}
              />
            ))}
          </BarChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey={xAxisKey}
              tickFormatter={xAxisTickFormatter}
              angle={xAxisAngle}
              textAnchor={xAxisAngle === 0 ? 'middle' : 'end'}
              height={xAxisHeight}
              interval="preserveStartEnd"
              tick={{ fontSize: 11 }}
            />
            <YAxis />
            <Tooltip labelFormatter={tooltipLabelFormatter} />
            <Legend />
            {dataKeys.map((dk) => (
              <Line
                key={dk.key}
                type="monotone"
                dataKey={dk.key}
                name={dk.name}
                stroke={dk.color || CHART_COLORS.temperature}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="chart-container">
      {title && <h3 className="chart-title">{title}</h3>}
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};
