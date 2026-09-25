// Ruscha lug'at alohida chunk: faqat ru tanlanganda yuklanadi (DESIGN §14).
const modules = import.meta.glob<Record<string, string>>('../locales/ru/*.json', { eager: true, import: 'default' });

const ru: Record<string, string> = {};
for (const dict of Object.values(modules)) Object.assign(ru, dict);
export default ru;
