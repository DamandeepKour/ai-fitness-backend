/** Indian food swap catalog — region-aware alternatives with cost & macro hints. */
export const INDIAN_FOOD_SWAPS = {
  paneer: [
    { name: "Tofu (soya paneer)", calories: 140, cost_inr: 45, protein_g: 14, reason: "Lower fat, similar protein" },
    { name: "Chana (boiled)", calories: 164, cost_inr: 25, protein_g: 9, reason: "Budget-friendly protein" },
    { name: "Soya chunks", calories: 120, cost_inr: 35, protein_g: 18, reason: "High protein, low cost" },
  ],
  "brown rice": [
    { name: "Millets (bajra/jowar)", calories: 190, cost_inr: 30, protein_g: 6, reason: "Lower GI, regional grain" },
    { name: "Quinoa (local brand)", calories: 180, cost_inr: 55, protein_g: 7, reason: "Complete protein" },
    { name: "Red rice", calories: 170, cost_inr: 40, protein_g: 4, reason: "South Indian staple swap" },
  ],
  rice: [
    { name: "Millets khichdi base", calories: 190, cost_inr: 30, protein_g: 6, reason: "Budget + fiber" },
    { name: "Broken wheat (dalia)", calories: 150, cost_inr: 20, protein_g: 5, reason: "North Indian pantry staple" },
  ],
  roti: [
    { name: "Jowar bhakri", calories: 120, cost_inr: 15, protein_g: 3, reason: "Gluten-free, Maharashtra style" },
    { name: "Ragi roti", calories: 130, cost_inr: 18, protein_g: 4, reason: "Calcium-rich South swap" },
  ],
  paratha: [
    { name: "Stuffed moong dal chilla", calories: 180, cost_inr: 25, protein_g: 10, reason: "Lighter breakfast swap" },
    { name: "Oats cheela", calories: 160, cost_inr: 20, protein_g: 7, reason: "High fiber, low oil" },
  ],
  poha: [
    { name: "Upma (rava)", calories: 200, cost_inr: 20, protein_g: 5, reason: "Similar prep, more satiety" },
    { name: "Vermicelli upma", calories: 190, cost_inr: 22, protein_g: 4, reason: "Quick South Indian swap" },
  ],
  idli: [
    { name: "Ragi idli", calories: 90, cost_inr: 18, protein_g: 3, reason: "More fiber, same ferment" },
    { name: "Moong dal chilla", calories: 120, cost_inr: 22, protein_g: 8, reason: "Higher protein breakfast" },
  ],
  dosa: [
    { name: "Adai (mixed dal dosa)", calories: 150, cost_inr: 25, protein_g: 9, reason: "Protein-rich Tamil Nadu style" },
    { name: "Ragi dosa", calories: 130, cost_inr: 20, protein_g: 4, reason: "Lower carb option" },
  ],
  dal: [
    { name: "Mixed sprout curry", calories: 140, cost_inr: 30, protein_g: 11, reason: "Raw protein boost" },
    { name: "Rajma (kidney beans)", calories: 180, cost_inr: 35, protein_g: 10, reason: "Hearty North Indian swap" },
  ],
  chicken: [
    { name: "Soya chunks curry", calories: 160, cost_inr: 40, protein_g: 18, reason: "Veg budget swap" },
    { name: "Fish (rohu/surmai)", calories: 170, cost_inr: 80, protein_g: 22, reason: "Lean coastal protein" },
    { name: "Eggs (2 boiled)", calories: 140, cost_inr: 20, protein_g: 12, reason: "Cheapest protein" },
  ],
  "greek yogurt": [
    { name: "Homemade curd (dahi)", calories: 90, cost_inr: 15, protein_g: 6, reason: "Indian staple, probiotic" },
    { name: "Chaas (buttermilk)", calories: 50, cost_inr: 10, protein_g: 3, reason: "Light, cooling swap" },
  ],
  oats: [
    { name: "Dalia (broken wheat porridge)", calories: 150, cost_inr: 18, protein_g: 5, reason: "Traditional warm swap" },
    { name: "Ragi malt", calories: 130, cost_inr: 20, protein_g: 4, reason: "South Indian toddler-to-adult staple" },
  ],
};

export const BUDGET_TIERS = {
  budget: { label: "Budget", daily_inr: 150, weekly_inr: 1050, hint: "Dal, roti, seasonal sabzi, eggs, local grains" },
  standard: { label: "Standard", daily_inr: 250, weekly_inr: 1750, hint: "Paneer, chicken twice/week, variety snacks" },
  premium: { label: "Premium", daily_inr: 400, weekly_inr: 2800, hint: "Fish, nuts, exotic veggies, protein supplements" },
};

export const GROCERY_PARTNERS = [
  { id: "blinkit", name: "Blinkit", url: "https://blinkit.com", delivery: "10 min" },
  { id: "zepto", name: "Zepto", url: "https://www.zeptonow.com", delivery: "10 min" },
  { id: "bigbasket", name: "BigBasket", url: "https://www.bigbasket.com", delivery: "Same day" },
  { id: "dmart", name: "DMart Ready", url: "https://www.dmartready.com", delivery: "Next day" },
];

export function findSwapsForFood(foodName) {
  const normalized = String(foodName || "").toLowerCase();
  for (const [key, swaps] of Object.entries(INDIAN_FOOD_SWAPS)) {
    if (normalized.includes(key)) {
      return { original: foodName, matchedKey: key, swaps };
    }
  }
  return {
    original: foodName,
    matchedKey: null,
    swaps: [
      { name: "Seasonal sabzi + dal", calories: 180, cost_inr: 35, protein_g: 8, reason: "Generic Indian budget swap" },
      { name: "Sprout salad + curd", calories: 150, cost_inr: 30, protein_g: 10, reason: "Pantry-friendly protein" },
    ],
  };
}
