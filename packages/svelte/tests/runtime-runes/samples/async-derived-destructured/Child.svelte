<script>
	let count = $state(1);

	let { squared, cubed } = $derived(await {
		squared: count ** 2,
		cubed: count ** 3
	});
</script>

<button onclick={() => count++}>increment</button>

<p>{count} ** 2 = {squared}</p>
<p>{count} ** 3 = {cubed}</p>
