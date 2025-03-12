/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

const PDX_ROLE = "<@&475812819191726111>";
const BOOF = "<@848762953184444467>";

const DATA_HEADER = '<script type=application/ld+json>{"@context":"http://schema.org","@type":"Event",';
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

		if (query.has("ui")) {
			const url = query.get("url");
			return new Response(`<a href="${url}">try again</a><br><br><a href="${url}&approved=1">approve</a>`, { headers: { "Content-Type": "text/html" } });
		}

		const date = query.has("date") 
			? query.get("date") 
			: getCurrentDateString();

		const moda = query.has("moda") ? query.get("moda") : MODA;

		await this.run(date, moda, env, query.has("approved"));

		return new Response("ok");
	},

	async scheduled(_, env, __) {
		await this.run(getCurrentDateString(), MODA, env, false);
	},

	async discord(url, message, image = "") {
		let body = {
			content: message + " ([source code](https://github.com/viboof/dontparkonmyass))",
			username: "don't park on my [ass]",
			avatar_url: "https://viboof.com/adamgun.png",
		};

		if (image) {
			body.embeds = [{ image: { url: "https://viboof.com/" + image }, color: 16711680 }]  //red
		}

		await fetch(url + "?wait=true", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(body)
		})
	},

	async run(date, moda, env, approved = false) {
		try {
			const res = await fetch(moda);
			const text = await res.text();

			console.log("text:", text);

			const parts = text.split(DATA_HEADER);

			// part 0 will be the web page before the first script,
			// part 1 will be the nearest upcoming event (or today),
			// part 2... will be further events we don't care about
			const event = JSON.parse("{" + parts[1].split(DATA_FOOTER)[0]);

			console.log("event:", event);

			const discordUrl = approved ? env.DISCORD_WEBHOOK_URL : env.APPROVAL_DISCORD_WEBHOOK_URL;
			const url = env.URL + "?key=" + env.SECRET_KEY + "&date=" + date + "&moda=" + encodeURIComponent(moda);
			const approvalText = `\n\ndecide: ${url}&ui=1&url=${encodeURIComponent(url)}${BOOF}`;
			const suffix = approved ? "" : approvalText;

			if (event.startDate.startsWith(date)) {
				await this.discord(discordUrl, `# ${PDX_ROLE} **${event.name}** at the Moda Center today <:ASSGUN:1004546251850788884>\n(${date})${suffix}`, "dontpark.png");
			} else {
				await this.discord(discordUrl, `nothing at the Moda Center today (${date}) <:ASSJKWON:1012402700438208652>${suffix}`);
			}
		} catch (e) {
			await this.discord(env.APPROVAL_DISCORD_WEBHOOK_URL, BOOF + " " + e + "\n" + e.stack);
			throw e;
		}
	},
};
