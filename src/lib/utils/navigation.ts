import { resolve } from '$app/paths';

export function carPath(carId: string): string {
	return resolve(`/app/cars/${carId}`);
}
