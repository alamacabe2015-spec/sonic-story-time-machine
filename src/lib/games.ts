export const coinsForAnswer = (correct: boolean) => correct ? 10 : 0;
export const canRedeemTitle = (coins: number, price: number, owned: boolean) => !owned && price > 0 && coins >= price;