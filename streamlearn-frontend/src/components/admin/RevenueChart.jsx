import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
const Tip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-bg-elevated border border-border rounded-lg p-3 text-sm shadow-xl">
      <p className="text-text-secondary mb-1">{label}</p>
      {payload.map((p,i) => <p key={i} style={{color:p.color}} className="font-semibold">{p.name}: {p.value}</p>)}
    </div>
  )
}
export function RevenueLineChart({ data=[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{top:5,right:20,left:0,bottom:5}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333"/>
        <XAxis dataKey="_id" stroke="#737373" tick={{fontSize:11}}/>
        <YAxis stroke="#737373" tick={{fontSize:11}}/>
        <Tooltip content={<Tip/>}/>
        <Line type="monotone" dataKey="revenue" stroke="#e50914" strokeWidth={2} dot={false} name="Revenue"/>
      </LineChart>
    </ResponsiveContainer>
  )
}
export function SubscriberBarChart({ data=[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{top:5,right:20,left:0,bottom:5}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#333"/>
        <XAxis dataKey="_id" stroke="#737373" tick={{fontSize:11}}/>
        <YAxis stroke="#737373" tick={{fontSize:11}}/>
        <Tooltip content={<Tip/>}/>
        <Bar dataKey="count" fill="#e50914" radius={[4,4,0,0]} name="Users"/>
      </BarChart>
    </ResponsiveContainer>
  )
}
