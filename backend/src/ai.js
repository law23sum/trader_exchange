// Simple demo AI responder used when integrating backend chat.
// Replace respond() with your real AI logic as needed.

export async function respond(history){
  // history: [{ role:'user'|'assistant'|'system', content:string }]
  const lastUser = [...history].reverse().find(m => m.role === 'user');
  const text = lastUser?.content?.trim() || '';
  if (!text) return "Hi! Ask me anything about traders, listings, or checkout.";
  const tips = [
    'You can browse categories from your dashboard.',
    'Add providers to favorites to find them later.',
    'Use tiers to adjust price/scope before checkout.',
  ];
  const tip = tips[Math.floor(Math.random()*tips.length)];
  return `You said: "${text}"\n\n${tip}`;
}

