import { getContext, setContext } from 'svelte';

const SELECT_KEY = Symbol('select-context');

type SelectValue = string;

export type SelectContext = {
	value: SelectValue;
	setValue: (v: SelectValue) => void;
};

export const createSelectContext = (initial: SelectValue) => {
	let current = initial;
	const ctx: SelectContext = {
		get value() {
			return current;
		},
		setValue: (v) => {
			current = v;
		}
	};
	setContext<SelectContext>(SELECT_KEY, ctx);
	return ctx;
};

export const useSelectContext = () => {
	const ctx = getContext<SelectContext>(SELECT_KEY);
	if (!ctx) throw new Error('Select components must be used inside <Select>');
	return ctx;
};
