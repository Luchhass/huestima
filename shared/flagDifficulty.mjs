export const FLAG_DIFFICULTY_IDS = {
  STARTER: "starter",
  INTERMEDIATE: "intermediate",
  ADVANCED: "advanced",
  EXPERT: "expert",
};

export const FLAG_DIFFICULTY_ORDER = [
  FLAG_DIFFICULTY_IDS.STARTER,
  FLAG_DIFFICULTY_IDS.INTERMEDIATE,
  FLAG_DIFFICULTY_IDS.ADVANCED,
  FLAG_DIFFICULTY_IDS.EXPERT,
];

// Curated from international flag-quiz recognition patterns, not population rank.
// Unlisted flags fall into Expert so every catalog item remains playable.
const FLAG_DIFFICULTY_POOLS = {
  [FLAG_DIFFICULTY_IDS.STARTER]: [
    "united-states-of-america", "united-states", "united-kingdom", "germany", "canada",
    "france", "italy", "spain", "japan", "china", "brazil", "india",
    "australia", "mexico", "russia", "turkey", "argentina", "south-korea",
    "switzerland", "netherlands", "sweden", "norway", "greece", "ireland",
    "portugal", "south-africa", "israel", "ukraine", "denmark", "finland",
    "poland", "belgium", "austria", "new-zealand", "saudi-arabia",
    "scotland",
  ],
  [FLAG_DIFFICULTY_IDS.INTERMEDIATE]: [
    "albania", "algeria", "armenia", "azerbaijan", "bahamas", "bangladesh",
    "belarus", "bolivia", "bosnia-and-herzegovina", "botswana", "bulgaria",
    "chile", "colombia", "costa-rica", "croatia", "cuba", "czech-republic",
    "ecuador", "egypt", "estonia", "ethiopia", "georgia", "ghana", "hungary",
    "iceland", "indonesia", "iran", "iraq", "jamaica", "jordan", "kazakhstan",
    "kenya", "kuwait", "lebanon", "libya", "malaysia", "morocco", "nepal",
    "nigeria", "north-korea", "pakistan", "peru", "philippines", "romania",
    "serbia", "singapore", "slovakia", "slovenia", "sri-lanka", "thailand",
    "tunisia", "turkmenistan", "uzbekistan", "vietnam",
  ],
  [FLAG_DIFFICULTY_IDS.ADVANCED]: [
    "afghanistan", "andorra", "angola", "antigua-and-barbuda", "bahrain",
    "barbados", "belize", "benin", "bhutan", "brunei", "burkina-faso",
    "burundi", "cabo-verde", "cambodia", "cameroon", "central-african-republic",
    "chad", "comoros", "congo-democratic-republic-of-the", "congo-republic-of-the",
    "cote-d-ivoire", "cyprus", "djibouti", "dominica", "dominican-republic",
    "east-timor", "el-salvador", "equatorial-guinea", "eritrea", "eswatini",
    "fiji", "gabon", "gambia", "grenada", "guatemala", "guinea", "guyana",
    "haiti", "honduras", "israel", "laos", "latvia", "lesotho", "liberia",
    "liechtenstein", "lithuania", "luxembourg", "madagascar", "malawi",
    "maldives", "mali", "malta", "mauritania", "mauritius", "moldova",
    "mongolia", "montenegro", "mozambique", "myanmar", "namibia", "nicaragua",
    "niger", "north-macedonia", "oman", "panama", "paraguay", "qatar", "rwanda",
    "senegal", "south-sudan", "sudan", "suriname", "syria", "taiwan", "tanzania",
    "togo", "trinidad-and-tobago", "uganda", "united-arab-emirates", "uruguay",
    "venezuela", "zambia", "zimbabwe",
  ],
};

const FLAG_DIFFICULTY_BY_ID = Object.entries(FLAG_DIFFICULTY_POOLS).reduce(
  (result, [difficulty, ids]) => {
    ids.forEach((id) => {
      if (!result[id]) result[id] = difficulty;
    });
    return result;
  },
  {},
);

export function getFlagDifficulty(flagId) {
  return FLAG_DIFFICULTY_BY_ID[flagId] || FLAG_DIFFICULTY_IDS.EXPERT;
}

export function getFlagsForDifficulty(flags, difficulty) {
  return flags.filter((flag) => getFlagDifficulty(flag.id) === difficulty);
}

export const FLAG_DIFFICULTY_OPTIONS = [
  { id: FLAG_DIFFICULTY_IDS.STARTER, label: "Starter", description: "The world's most recognizable flags." },
  { id: FLAG_DIFFICULTY_IDS.INTERMEDIATE, label: "Intermediate", description: "Familiar flags with more visual variety." },
  { id: FLAG_DIFFICULTY_IDS.ADVANCED, label: "Advanced", description: "Less common flags and closer lookalikes." },
  { id: FLAG_DIFFICULTY_IDS.EXPERT, label: "Expert", description: "Rare flags and the hardest visual distinctions." },
];
