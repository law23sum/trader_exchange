export const currency = (n) => new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n);
export const uid = () => Math.random().toString(36).slice(2,10);
export const now = () => new Date().toISOString();
export const Roles = { PROVIDER: 'PROVIDER', SEEKER: 'SEEKER' };
export const Status = { DRAFT:'DRAFT', LISTED:'LISTED', REQUESTED:'REQUESTED', ACCEPTED:'ACCEPTED', IN_ESCROW:'IN_ESCROW', DELIVERED:'DELIVERED', COMPLETED:'COMPLETED', DISPUTED:'DISPUTED', RESOLVED:'RESOLVED', REFUNDED:'REFUNDED', CANCELLED:'CANCELLED' };
export function Badge({children,className=''}){
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-gray-600 ${className}`}>{children}</span>;
}
export function Pill({children}){
  return <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-600">{children}</span>;
}
export function Button({children,onClick,variant='primary',type='button',className='',disabled=false,...rest}){
  const base='inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2';
  const m={
    primary:'bg-gray-900 text-white hover:bg-gray-800 focus-visible:outline-gray-900',
    ghost:'bg-white text-gray-800 border border-gray-200 hover:bg-gray-100 focus-visible:outline-gray-300',
    subtle:'bg-gray-100 text-gray-800 hover:bg-gray-200 focus-visible:outline-gray-200',
    danger:'bg-white text-red-600 border border-red-200 hover:bg-red-50 focus-visible:outline-red-300'
  };
  const disabledStyles = disabled ? ' cursor-not-allowed opacity-60 hover:bg-inherit focus-visible:outline-none' : ''
  return (
    <button
      className={`${base} ${m[variant]||m.primary} ${disabledStyles} ${className}`}
      onClick={onClick}
      type={type}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
export function Input({value,onChange,placeholder,type='text',onKeyDown}){
  return (
    <input
      className="w-full rounded-xl border border-gray-200 bg-white px-3.5 py-2.5 text-sm shadow-sm focus:border-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300/70"
      value={value}
      type={type}
      onChange={(e)=>onChange(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
    />
  );
}
export function Section({title,right,children}){
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-semibold tracking-tight text-gray-900">{title}</h2>
        {right}
      </div>
      <div className="tx-card p-5">{children}</div>
    </section>
  );
}
export function PlayerBadge({ player }){
  return (<div className="flex items-center gap-3">
    <div className="grid size-9 place-items-center rounded-full border border-gray-200 bg-white text-sm font-semibold text-gray-700">{player?.name?.[0]}</div>
    <div className="leading-tight">
      <div className="text-sm font-semibold text-gray-900">{player?.name}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{player?.role === 'PROVIDER' ? 'Provider' : 'Seeker'} · ⭐ {player?.rating} · {player?.jobs} jobs</div>
    </div>
  </div>);
}
