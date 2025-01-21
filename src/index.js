/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const DATA_HEADER = '<script type="application/ld+json">';
const DATA_FOOTER = "</script>";
const MODA = "https://www.modaportland.com/events/";

function getCurrentDateString() {
	// 2024-12-18T20:11:53.307Z
	return new Date().toISOString().split("T")[0];
}

export default {
	async fetch(request, env, _) {
		const url = new URL(request.url);

		if (url.pathname !== "/") {
			return new Response("no");
		}

		const query = url.searchParams;

		if (!query.has("key") || query.get("key") !== env.SECRET_KEY) {
			return new Response("no");
		};

		const date = query.has("date") 
			? query.get("date") 
			: getCurrentDateString();

		const moda = query.has("moda") ? query.get("moda") : MODA;

		await this.run(date, moda, env);

		return new Response("ok");
	},

	async scheduled(_, env, __) {
		await this.run(getCurrentDateString(), MODA, env);
	},

	async discord(url, message) {
		await fetch(url + "?wait=true", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				content: message + " ([source code](https://github.com/viboof/dontparkonmyass))",
				username: "don't park on my [ass]",
				avatar_url: "https://viboof.com/adamgun.png",
			})
		})
	},

	async run(date, moda, env) {
		const res = await fetch(moda);
		const text = await res.text();

		const parts = text.split(DATA_HEADER);

		// part 0 will be the web page before the first script,
		// part 1 will be the nearest upcoming event (or today),
		// part 2... will be further events we don't care about
		const event = JSON.parse(parts[1].split(DATA_FOOTER)[0]);

		const discordUrl = env.DISCORD_WEBHOOK_URL;

		if (event.startDate.startsWith(date)) {
			await this.discord(discordUrl, `**${event.name}** at the Moda Center today (${date})! park with caution <:ASSGUN:1004546251850788884>`);
		} else {
			await this.discord(discordUrl, `nothing at the Moda Center today (${date}) <:ASSJKWON:1012402700438208652>`);
		}
	},
};
