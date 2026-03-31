<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	import { REPAIR_STATUS } from '$lib/constants';
	import type { RepairStatus } from '$lib/types.js';

	const repairs = useRepairs();
	let currentDate = $state(new Date());

	const currentYear = $derived(currentDate.getFullYear());
	const currentMonth = $derived(currentDate.getMonth());

	const monthNames = [
		'January',
		'February',
		'March',
		'April',
		'May',
		'June',
		'July',
		'August',
		'September',
		'October',
		'November',
		'December'
	];
	const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

	const firstDayOfMonth = $derived(new Date(currentYear, currentMonth, 1).getDay());
	const daysInMonth = $derived(new Date(currentYear, currentMonth + 1, 0).getDate());

	const calendarDays = $derived.by(() => {
		const days = [];
		// Add empty cells for days before the first day of the month
		for (let i = 0; i < firstDayOfMonth; i++) {
			days.push(null);
		}
		// Add all days of the month
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}
		return days;
	});

	const getRepairsForDay = (day: number) => {
		const date = new Date(currentYear, currentMonth, day);
		return repairs.repairs.filter((repair) => {
			const startDate = new Date(repair.startDate);
			const completedDate = repair.completedDate ? new Date(repair.completedDate) : null;

			// Check if repair starts on this day
			if (startDate.toDateString() === date.toDateString()) return true;

			// Check if repair is completed on this day
			if (completedDate && completedDate.toDateString() === date.toDateString()) return true;

			// Check if repair is in progress on this day
			if (completedDate) {
				return date >= startDate && date <= completedDate;
			} else {
				return date >= startDate;
			}
		});
	};

	const previousMonth = () => {
		currentDate = new Date(currentYear, currentMonth - 1, 1);
	};

	const nextMonth = () => {
		currentDate = new Date(currentYear, currentMonth + 1, 1);
	};

	const goToToday = () => {
		currentDate = new Date();
	};

	const isToday = (day: number) => {
		const today = new Date();
		return (
			day === today.getDate() &&
			currentMonth === today.getMonth() &&
			currentYear === today.getFullYear()
		);
	};

	const statusColors: Record<RepairStatus, string> = {
		[REPAIR_STATUS.PENDING]: 'bg-yellow-500/20 border-yellow-500/50',
		[REPAIR_STATUS.ESTIMATE_PENDING]: 'bg-yellow-500/20 border-yellow-500/50',
		[REPAIR_STATUS.ESTIMATE_APPROVED]: 'bg-blue-500/20 border-blue-500/50',
		[REPAIR_STATUS.IN_PROGRESS]: 'bg-blue-500/20 border-blue-500/50',
		[REPAIR_STATUS.COMPLETED]: 'bg-green-500/20 border-green-500/50',
		[REPAIR_STATUS.PAID]: 'bg-green-500/20 border-green-500/50'
	};
</script>

<div class="p-6 space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Repair Calendar</h1>
			<p class="text-muted-foreground">View all scheduled repairs</p>
		</div>
		<div class="flex items-center gap-2">
			<Button variant="outline" onclick={goToToday}>Today</Button>
			<Button variant="outline" size="icon" onclick={previousMonth}>
				<ChevronLeftIcon />
			</Button>
			<div class="min-w-[200px] text-center font-semibold">
				{monthNames[currentMonth]}
				{currentYear}
			</div>
			<Button variant="outline" size="icon" onclick={nextMonth}>
				<ChevronRightIcon />
			</Button>
		</div>
	</div>

	<Card>
		<CardContent class="p-4">
			<div class="grid grid-cols-7 gap-2">
				{#each dayNames as dayName (dayName)}
					<div class="text-center font-semibold text-sm p-2 text-muted-foreground">
						{dayName}
					</div>
				{/each}

				{#each calendarDays as day, index (index)}
					{#if day === null}
						<div class="aspect-square"></div>
					{:else}
						{@const dayRepairs = getRepairsForDay(day)}
						<div
							class="aspect-square border rounded-lg p-2 flex flex-col gap-1 overflow-hidden hover:shadow-lg-lg transition-shadow-lg {isToday(
								day
							)
								? 'border-primary border-2'
								: ''}"
							transition:fly={{ y: 10, duration: 200, delay: index * 5 }}
						>
							<div class="text-sm font-medium {isToday(day) ? 'text-primary' : ''}">
								{day}
							</div>
							<div class="flex-1 overflow-y-auto space-y-1">
								{#each dayRepairs.slice(0, 3) as repair (repair.id)}
									{@const car = repairs.cars.find((c) => c.id === repair.carId)}
									<button
										type="button"
										onclick={() => repairs.selectCar(repair.carId)}
										class="w-full text-left"
									>
										<div
											class="text-xs p-1 rounded border {statusColors[
												repair.status
											]} truncate hover:scale-105 transition-transform"
										>
											{car ? `${car.brand} ${car.model}` : 'Unknown'}
										</div>
									</button>
								{/each}
								{#if dayRepairs.length > 3}
									<div class="text-xs text-muted-foreground text-center">
										+{dayRepairs.length - 3} more
									</div>
								{/if}
							</div>
						</div>
					{/if}
				{/each}
			</div>
		</CardContent>
	</Card>

	<div class="flex items-center gap-4 text-sm">
		<span class="font-medium">Legend:</span>
		<div class="flex items-center gap-2">
			<div class="size-4 rounded border {statusColors[REPAIR_STATUS.PENDING]}"></div>
			<span>Pending</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="size-4 rounded border {statusColors[REPAIR_STATUS.IN_PROGRESS]}"></div>
			<span>In Progress</span>
		</div>
		<div class="flex items-center gap-2">
			<div class="size-4 rounded border {statusColors[REPAIR_STATUS.COMPLETED]}"></div>
			<span>Completed</span>
		</div>
	</div>
</div>
