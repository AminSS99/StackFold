export function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

export function generateToken(payload: string): string {
  return `mock_jwt_${payload}_${process.env.JWT_SECRET || 'dev_secret'}`;
}
