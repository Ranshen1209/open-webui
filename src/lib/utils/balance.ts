/**
 * Format a balance amount for display, e.g. formatBalance(8.94, '¥') -> '¥8.94'.
 * Returns '' when amount is not a finite number so callers can hide the widget.
 */
export const formatBalance = (
	amount: number | null | undefined,
	symbol: string | null | undefined
): string => {
	if (typeof amount !== 'number' || !Number.isFinite(amount)) {
		return '';
	}
	const sym = symbol && symbol.length > 0 ? symbol : '¥';
	return `${sym}${amount.toFixed(2)}`;
};
