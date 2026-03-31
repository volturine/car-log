<script lang="ts">
	import { useRepairs } from '$lib/hooks/repairs.svelte.js';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { ChevronLeftIcon, ChevronRightIcon, CalendarClockIcon, WrenchIcon } from '@lucide/svelte';
	import { fly } from 'svelte/transition';

	import { REPAIR_STATUS } from '$lib/constants';
	import { Skeleton } from '$lib/components/ui/skeleton';
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
		const days: Array<number | null> = [];
		for (let i = 0; i < firstDayOfMonth; i++) {
			days.push(null);
		}
		for (let i = 1; i <= daysInMonth; i++) {
			days.push(i);
		}
		return days;
	});

	const getRepairsForDay = (day: number) => {
		const date = new Date(currentYear, currentMonth, day);
		const dateStr = date.toDateString();
		return repairs.repairs.filter((repair) => {
			if (repair.appointmentAt) {
				const appt = new Date(repair.appointmentAt);
				if (appt.toDateString() === dateStr) return true;
			}

			const startDate = new Date(repair.startDate);
			const completedDate = repair.completedDate ? new Date(repair.completedDate) : null;

			if (startDate.toDateString() === dateStr) return true;
			if (completedDate && completedDate.toDateString() === dateStr) return true;

			if (completedDate) {
				return date >= startDate && date <= completedDate;
			}
			return date >= startDate;
		});
	};

	const monthAppointments = $derived.by(() => {
		return repairs.repairs.filter((r) => {
			if (!r.appointmentAt) return false;
			const appt = new Date(r.appointmentAt);
			return appt.getFullYear() === currentYear && appt.getMonth() === currentMonth;
		}).length;
	});

	const monthActive = $derived.by(() => {
		return repairs.repairs.filter(
			(r) => r.status === REPAIR_STATUS.IN_PROGRESS || r.status === REPAIR_STATUS.ESTIMATE_APPROVED
		).length;
	});

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

	function buildTooltip(
		car: { brand: string; model: string } | undefined,
		hasAppt: boolean,
		apptTime: string,
		mechanic: { name: string | null } | null | undefined,
		title: string
	): string {
		const vehicle = car ? `${car.brand} ${car.model}` : 'Unknown';
		const time = hasAppt ? ` @ ${apptTime}` : '';
		const assigned = mechanic?.name ? ` — ${mechanic.name}` : '';
		return `${vehicle}${time}${assigned} — ${title}`;
	}

	const statusColors: Record<RepairStatus, string> = {
		[REPAIR_STATUS.PENDING]: 'bg-yellow-500/20 border-yellow-500/50',
		[REPAIR_STATUS.ESTIMATE_PENDING]: 'bg-yellow-500/20 border-yellow-500/50',
		[REPAIR_STATUS.ESTIMATE_APPROVED]: 'bg-blue-500/20 border-blue-500/50',
		[REPAIR_STATUS.ESTIMATE_REJECTED]: 'bg-red-500/20 border-red-500/50',
		[REPAIR_STATUS.IN_PROGRESS]: 'bg-blue-500/20 border-blue-500/50',
		[REPAIR_STATUS.COMPLETED]: 'bg-green-500/20 border-green-500/50',
		[REPAIR_STATUS.PAID]: 'bg-green-500/20 border-green-500/50'
	};
</script>

<div class="space-y-6 p-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold">Repair Calendar</h1>
			<p class="text-muted-foreground">View all scheduled repairs and appointments</p>
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

	{#if repairs.loading}
		<Card>
			<CardContent class="p-4">
				<div class="grid grid-cols-7 gap-2">
					{#each dayNames as dayName (dayName)}
						<div class="p-2 text-center text-sm font-semibold text-muted-foreground">
							{dayName}
						</div>
					{/each}
					{#each Array(35) as _, i (i)}
						<Skeleton class="aspect-square rounded-lg" />
					{/each}
				</div>
			</CardContent>
		</Card>
	{:else}
		{#if monthAppointments > 0 || monthActive > 0}
			<div class="flex flex-wrap gap-3">
				{#if monthAppointments > 0}
					<Badge variant="outline" class="gap-1.5 px-3 py-1">
						<CalendarClockIcon class="size-3.5" />
						{monthAppointments} scheduled appointment{monthAppointments === 1 ? '' : 's'}
					</Badge>
				{/if}
				{#if monthActive > 0}
					<Badge variant="outline" class="gap-1.5 px-3 py-1">
						<WrenchIcon class="size-3.5" />
						{monthActive} active repair{monthActive === 1 ? '' : 's'}
					</Badge>
				{/if}
			</div>
		{/if}

		<Card>
			<CardContent class="p-4">
				<div class="grid grid-cols-7 gap-2">
					{#each dayNames as dayName (dayName)}
						<div class="p-2 text-center text-sm font-semibold text-muted-foreground">
							{dayName}
						</div>
					{/each}

					{#each calendarDays as day, index (index)}
						{#if day === null}
							<div class="aspect-square"></div>
						{:else}
							{@const dayRepairs = getRepairsForDay(day)}
							{@const apptCount = dayRepairs.filter((r) => r.appointmentAt).length}
							<div
								class="flex aspect-square flex-col gap-1 overflow-hidden rounded-lg border p-2 transition-shadow hover:shadow-md {isToday(
									day
								)
									? 'border-2 border-primary'
									: ''}"
								transition:fly={{ y: 10, duration: 200, delay: index * 5 }}
							>
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium {isToday(day) ? 'text-primary' : ''}">
										{day}
									</span>
									{#if apptCount > 0}
										<span
											class="flex items-center gap-0.5 text-[10px] text-blue-600 dark:text-blue-400"
											title="{apptCount} appointment{apptCount === 1 ? '' : 's'}"
										>
											<CalendarClockIcon class="size-3" />
											{apptCount}
										</span>
									{/if}
								</div>
								<div class="flex-1 space-y-1 overflow-y-auto">
									{#each dayRepairs.slice(0, 3) as repair (repair.id)}
										{@const car = repairs.cars.find((c) => c.id === repair.carId)}
										{@const hasAppt = Boolean(repair.appointmentAt)}
										{@const apptTime = hasAppt
											? new Date(repair.appointmentAt!).toLocaleTimeString('en-US', {
													hour: 'numeric',
													minute: '2-digit'
												})
											: ''}
										<button
											type="button"
											onclick={() => goto(resolve(`/app/cars/${repair.carId}`))}
											class="w-full text-left"
										>
											<div
												class="rounded border p-1 text-xs {statusColors[
													repair.status
												]} truncate transition-transform hover:scale-105"
												title={buildTooltip(
													car,
													hasAppt,
													apptTime,
													repair.assignedMechanic,
													repair.title
												)}
											>
												{#if hasAppt}
													<span class="font-semibold">{apptTime}</span>
													&nbsp;
												{/if}
												{car ? `${car.brand} ${car.model}` : 'Unknown'}
											</div>
										</button>
									{/each}
									{#if dayRepairs.length > 3}
										<div class="text-center text-xs text-muted-foreground">
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

		<div class="flex flex-wrap items-center gap-4 text-sm">
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
			<span class="text-muted-foreground">•</span>
			<div class="flex items-center gap-1 text-muted-foreground">
				<CalendarClockIcon class="size-3.5" />
				<span>Scheduled appointments show time</span>
			</div>
		</div>
	{/if}
</div>
