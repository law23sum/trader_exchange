export const currency = (n) => new Intl.NumberFormat(undefined,{style:'currency',currency:'USD'}).format(n);
export const uid = () => Math.random().toString(36).slice(2,10);
export const now = () => new Date().toISOString();
export const Roles = { PROVIDER: 'PROVIDER', SEEKER: 'SEEKER' };
export const Status = { DRAFT:'DRAFT', LISTED:'LISTED', REQUESTED:'REQUESTED', ACCEPTED:'ACCEPTED', IN_ESCROW:'IN_ESCROW', DELIVERED:'DELIVERED', COMPLETED:'COMPLETED', DISPUTED:'DISPUTED', RESOLVED:'RESOLVED', REFUNDED:'REFUNDED', CANCELLED:'CANCELLED' };
