export const GAME_MODES = [
  { id: "easy", label: "Fácil", zone: "Green Hill", total: 8, reward: 10 },
  { id: "normal", label: "Normal", zone: "Chemical Plant", total: 10, reward: 15 },
  { id: "hard", label: "Difícil", zone: "Death Egg", total: 10, reward: 25 },
  { id: "chaos", label: "Caos", zone: "Cyber Space", total: 12, reward: 40 },
] as const;
export type GameMode = typeof GAME_MODES[number]["id"];
export const coinsForAnswer = (correct: boolean, mode: GameMode = "easy") => correct ? (GAME_MODES.find((m) => m.id === mode)?.reward ?? 0) : 0;
export const canRedeemTitle = (coins: number, price: number, owned: boolean) => !owned && price > 0 && coins >= price;