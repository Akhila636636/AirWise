import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import type { HourlyAirData } from '@airwise/shared';

interface ForecastChartProps {
  data: readonly HourlyAirData[];
}

export default function ForecastChart({ data }: ForecastChartProps) {
  const chartData = data.slice(0, 24).map((d) => {
    const date = new Date(d.time);
    const hour = date.getHours();
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedHour = `${hour % 12 || 12} ${ampm}`;

    return {
      time: formattedHour,
      aqi: d.usAqi,
      pm25: d.pm25,
    };
  });

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
        >
          <defs>
            <linearGradient id="aqiGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.4} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="time"
            stroke="var(--color-text-secondary)"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="var(--color-text-secondary)"
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'var(--color-bg)',
              borderColor: 'var(--color-border)',
              borderRadius: 'var(--border-radius)',
              color: 'var(--color-text)',
              fontSize: '12px',
              boxShadow: 'var(--shadow-md)',
            }}
          />
          <Area
            type="monotone"
            dataKey="aqi"
            name="US AQI"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#aqiGradient)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
