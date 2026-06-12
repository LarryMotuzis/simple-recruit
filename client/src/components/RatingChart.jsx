import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function RatingChart({ data }) {
  if (!data || data.length < 2) {
    return (
      <p style={{ color: '#999', fontSize: 13, margin: '8px 0' }}>
        {data?.length === 1
          ? 'Log one more evaluation to see the trend.'
          : 'No evaluations yet.'}
      </p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
        <YAxis domain={[1, 10]} ticks={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]} tick={{ fontSize: 11 }} />
        <Tooltip formatter={(v) => [`${v} / 10`, 'Rating']} />
        <Line
          type="monotone"
          dataKey="rating"
          stroke="#4a90d9"
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
