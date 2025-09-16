export const currency = (n) => new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n);
export const uid = () => Math.random().toString(36).slice(2,10);
export const now = () => new Date().toISOString();
export const Roles = { PROVIDER: 'PROVIDER', SEEKER: 'SEEKER' };
export const Status = { DRAFT:'DRAFT', LISTED:'LISTED', REQUESTED:'REQUESTED', ACCEPTED:'ACCEPTED', IN_ESCROW:'IN_ESCROW', DELIVERED:'DELIVERED', COMPLETED:'COMPLETED', DISPUTED:'DISPUTED', RESOLVED:'RESOLVED', REFUNDED:'REFUNDED', CANCELLED:'CANCELLED' };
export function Badge({children,className=''}){ return <span className={`px-2 py-0.5 rounded-full text-xs border ${className}`}>{children}</span>; }
export function Pill({children}){ return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 border border-gray-200">{children}</span>; }
export function Button({children,onClick,variant='primary',type='button'}){
  const base='inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border transition';
  const m={primary:'bg-black text-white border-black hover:opacity-90 focus:ring-2 focus:ring-black/20',ghost:'bg-white text-gray-800 border-gray-200 hover:bg-gray-50',danger:'bg-white text-red-600 border-red-300 hover:bg-red-50'};
  return <button className={`${base} ${m[variant]}`} onClick={onClick} type={type}>{children}</button>;
}
export function Input({value,onChange,placeholder,type='text',onKeyDown}){
  return <input className="w-full px-3 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-black/20" value={value} type={type} onChange={(e)=>onChange(e.target.value)} onKeyDown={onKeyDown} placeholder={placeholder}/>;
}
export function Section({title,right,children}){
  return <section className="mb-6"><div className="flex items-center justify-between mb-3"><h2 className="text-lg font-semibold">{title}</h2>{right}</div><div className="bg-white rounded-2xl shadow-sm border p-4">{children}</div></section>;
}
export function PlayerBadge({ player }){
  return (<div className="flex items-center gap-2">
    <div className="size-7 rounded-full bg-gradient-to-tr from-gray-200 to-gray-50 border grid place-items-center text-xs font-semibold">{player?.name?.[0]}</div>
    <div className="leading-tight"><div className="text-sm font-medium">{player?.name}</div>
      <div className="text-[11px] text-gray-500">{player?.role === 'PROVIDER' ? 'Provider' : 'Seeker'} · ⭐ {player?.rating} · {player?.jobs} jobs</div></div>
  </div>);
}
