/* E Card website dashboard (/dashboard): everything an Occasion Manager does,
   without the Desk. Talks to e_card_ms.api.portal (plus the existing
   messaging / reminders / payments endpoints), which re-check permissions on
   every call. Routes live in the hash: #/  #/new  #/o/<occasion>/<tab>. */
(function () {
	"use strict";

	// ------------------------------------------------------------------ text
	const SW = {
		loading: "Inapakia...",
		hello: "Habari, {0}",
		home_lede: "Matukio yako yote mahali pamoja.",
		new_event: "Tukio jipya",
		no_events: "Bado huna tukio. Anza kwa kuunda la kwanza.",
		days_left: "siku {0} zimebaki",
		today: "leo",
		past: "limepita",
		guests: "Wageni",
		confirmed: "Wamethibitisha",
		invited: "Wamealikwa",
		checked_in: "Wameingia",
		collected: "Michango",
		outstanding: "Salio la ahadi",
		of: "kati ya",
		sms_credits: "SMS credits",
		wa_credits: "WhatsApp credits",
		buy_credits: "Nunua credits",
		back: "Matukio yangu",
		tab_overview: "Muhtasari",
		tab_guests: "Wageni",
		tab_contrib: "Michango",
		tab_budget: "Bajeti",
		tab_card: "Kadi",
		tab_pay: "Malipo",
		tab_gate: "Getini",
		tab_details: "Taarifa",
		save: "Hifadhi",
		saved: "Imehifadhiwa",
		cancel: "Ghairi",
		close: "Funga",
		edit: "Hariri",
		delete: "Futa",
		confirm_delete: "Una uhakika unataka kufuta?",
		search: "Tafuta jina au simu",
		all: "Wote",
		name: "Jina",
		phone: "Simu",
		card_type: "Aina ya kadi",
		code: "Code",
		rsvp: "Jibu",
		sent: "Imetumwa",
		gate: "Getini",
		actions: "Vitendo",
		add_guest: "Ongeza mgeni",
		generate_cards: "Tengeneza kadi zote",
		send_wa_all: "Tuma WhatsApp kwa wote",
		send_sms_all: "Tuma SMS kwa wote",
		send_wa: "Tuma WhatsApp",
		send_sms: "Tuma SMS",
		make_card: "Tengeneza kadi",
		view_card: "Angalia kadi",
		not_sent: "Hawajatumiwa",
		no_guests: "Bado hakuna wageni. Ongeza mgeni, au wachangiaji waliokamilisha wataongezwa wenyewe.",
		chart_collected: "Michango iliyokusanywa (TZS, jumla)",
		chart_invited: "Wageni waliotumiwa mwaliko (jumla)",
		chart_arrivals: "Waliofika getini (jumla)",
		chart_arrivals_time: "Waliofika getini kwa saa (jumla)",
		empty_collected: "Bado hakuna malipo ya michango.",
		empty_invited: "Bado hakuna mwaliko uliotumwa.",
		empty_arrivals: "Bado hakuna aliyeingia getini.",
		show_table: "Onyesha jedwali",
		hide_table: "Ficha jedwali",
		budget_progress: "Bajeti na michango",
		collected_vs_budget: "Imekusanywa / bajeti",
		collected_vs_pledged: "Imekusanywa / ahadi",
		spent_vs_budget: "Imetumika / bajeti",
		cards_paid: "Kadi zilizolipiwa",
		no_subscription: "Hujalipia kadi bado",
		pay_cards: "Lipia kadi",
		pledged: "Ahadi",
		paid: "Amelipa",
		balance: "Salio",
		status: "Hali",
		st_full: "Amekamilisha",
		st_part: "Sehemu",
		st_none: "Hajalipa",
		add_contrib: "Ongeza mchangiaji",
		record_payment: "Rekodi malipo",
		import_excel: "Ingiza Excel",
		export_excel: "Pakua Excel",
		send_reminders: "Tuma vikumbusho",
		remind: "Kumbusha",
		payments: "Malipo ya michango",
		date: "Tarehe",
		amount: "Kiasi",
		method: "Njia",
		reference: "Kumbukumbu",
		notes: "Maelezo",
		no_contrib: "Bado hakuna wachangiaji. Ongeza, au ingiza orodha yako ya Excel.",
		on_guest_list: "Yuko kwenye wageni",
		reminder_settings: "Mipangilio ya michango na vikumbusho",
		deadline: "Mwisho wa michango",
		pay_instructions: "Maelekezo ya kulipa (mf. M-Pesa 07XX XXX XXX, Jina)",
		auto_add: "Ongeza waliokamilisha kwenye wageni wenyewe",
		auto_remind: "Tuma vikumbusho vyenyewe",
		remind_every: "Kumbusha kila siku",
		reminder_text: "Ujumbe wa kikumbusho (acha wazi kutumia wa kawaida)",
		category: "Kundi",
		description: "Maelezo",
		budgeted: "Bajeti",
		spent: "Imetumika",
		add_item: "Ongeza kipengele",
		total_budget: "Jumla ya bajeti",
		total_spent: "Imetumika",
		gap: "Pengo (bajeti − michango)",
		card_design: "Muundo wa kadi",
		upload_design: "Pakia muundo (PNG/JPG kutoka Canva)",
		uploading: "Inapakia...",
		style: "Mtindo wa maandishi",
		font_size: "Ukubwa wa jina",
		name_color: "Rangi ya jina",
		type_color: "Rangi ya aina ya kadi",
		font: "Herufi",
		make_preview: "Tengeneza mfano",
		preview_hint: "Jina, aina ya kadi na QR huwekwa kwenye kona ya chini kulia. Acha nafasi hapo kwenye muundo wako.",
		no_design: "Bado hujapakia muundo wa kadi.",
		sample_card: "Kadi halisi ya mgeni",
		request_cards: "Omba kadi",
		how_many_cards: "Kadi ngapi?",
		quote_total: "Jumla",
		includes_credits: "Inajumuisha SMS {0} na WhatsApp {1}",
		locked_note: "Kadi {0} za ziada zinabaki kwa bei yako ya awali.",
		pay_now: "Lipa sasa",
		pay_title: "Lipia kadi",
		pay_phone: "Namba ya pesa ya simu (M-Pesa, Mixx, Airtel, HaloPesa)",
		accept_terms: "Nakubali Vigezo na Masharti",
		check_phone: "Angalia simu yako uweke PIN kukamilisha malipo.",
		paid_ok: "Malipo yamepokelewa! Kadi zimefunguliwa na risiti imetumwa kwa WhatsApp.",
		pay_failed: "Malipo hayakufanikiwa. Jaribu tena.",
		pay_wait: "Tunasubiri uthibitisho wa malipo. Utaona hapa yakithibitishwa.",
		sub_paid: "Imelipwa",
		sub_pending: "Inasubiri malipo",
		sub_paying: "Inasubiri PIN",
		sub_failed: "Malipo yameshindwa",
		receipt: "Risiti",
		subscriptions: "Vifurushi vya kadi",
		no_subs: "Bado hujaomba kifurushi cha kadi.",
		gate_pin: "PIN ya geti",
		gate_pin_hint: "Wape walinzi wa getini tu. Wanaiweka mara moja kwenye ukurasa wa geti.",
		gate_link: "Kiungo cha geti",
		open_gate: "Fungua ukurasa wa geti",
		copy: "Nakili",
		copied: "Imenakiliwa",
		allow_reentry: "Ruhusu kuingia zaidi ya mara moja",
		recent_arrivals: "Waliofika karibuni",
		none_yet: "Bado hakuna.",
		details: "Taarifa za tukio",
		occasion_name: "Jina la tukio",
		host: "Wenyeji / waandaaji",
		occasion_date: "Tarehe",
		occasion_time: "Muda (kama utakavyoandikwa kwenye ujumbe)",
		venue: "Ukumbi",
		venue_address: "Anwani ya ukumbi",
		maps: "Kiungo cha Google Maps",
		dress_code: "Dress code",
		contact_1: "Mawasiliano 1",
		contact_2: "Mawasiliano 2",
		create: "Unda tukio",
		created: "Tukio limeundwa",
		credits_needed: "Credits zinahitajika: {0}, unazo: {1}",
		no_one_to_send: "Wageni wote wameshatumiwa kwa {0}.",
		send_confirm: "Tuma mwaliko kwa {0} wageni kwa {1}?",
		result: "Imefanikiwa {0}, imeshindwa {1}",
		reminder_preview: "Mfano wa ujumbe",
		channel: "Tuma kwa",
		both: "Zote mbili",
		terms_title: "Vigezo na Masharti vimebadilika",
		terms_body: "Tafadhali soma na ukubali Vigezo na Masharti mapya kuendelea.",
		read_terms: "Soma Vigezo na Masharti",
		accept: "Nakubali",
		file: "Faili (.xlsx au .csv)",
		template: "Pakua kiolezo",
		import_done: "Wameongezwa {0}, wamesasishwa {1}",
		contributor: "Mchangiaji",
		required: "Jaza sehemu zinazohitajika.",
		rsvp_Pending: "Hajajibu",
		rsvp_Confirmed: "Atakuja",
		rsvp_Declined: "Hatakuja",
		error: "Kuna tatizo",
	};
	const EN = {
		loading: "Loading...",
		hello: "Hello, {0}",
		home_lede: "All your events in one place.",
		new_event: "New event",
		no_events: "You don't have an event yet. Start by creating your first one.",
		days_left: "{0} days to go",
		today: "today",
		past: "past",
		guests: "Guests",
		confirmed: "Confirmed",
		invited: "Invited",
		checked_in: "Checked in",
		collected: "Contributions",
		outstanding: "Outstanding pledges",
		of: "of",
		sms_credits: "SMS credits",
		wa_credits: "WhatsApp credits",
		buy_credits: "Buy credits",
		back: "My events",
		tab_overview: "Overview",
		tab_guests: "Guests",
		tab_contrib: "Contributions",
		tab_budget: "Budget",
		tab_card: "Card",
		tab_pay: "Payments",
		tab_gate: "Gate",
		tab_details: "Details",
		save: "Save",
		saved: "Saved",
		cancel: "Cancel",
		close: "Close",
		edit: "Edit",
		delete: "Delete",
		confirm_delete: "Are you sure you want to delete this?",
		search: "Search name or phone",
		all: "All",
		name: "Name",
		phone: "Phone",
		card_type: "Card type",
		code: "Code",
		rsvp: "RSVP",
		sent: "Sent",
		gate: "Gate",
		actions: "Actions",
		add_guest: "Add guest",
		generate_cards: "Generate all cards",
		send_wa_all: "Send WhatsApp to all",
		send_sms_all: "Send SMS to all",
		send_wa: "Send WhatsApp",
		send_sms: "Send SMS",
		make_card: "Generate card",
		view_card: "View card",
		not_sent: "Not invited yet",
		no_guests: "No guests yet. Add a guest, or fully paid contributors will be added automatically.",
		chart_collected: "Contributions collected (TZS, cumulative)",
		chart_invited: "Guests invited (cumulative)",
		chart_arrivals: "Arrivals at the gate (cumulative)",
		chart_arrivals_time: "Arrivals at the gate by time (cumulative)",
		empty_collected: "No contribution payments yet.",
		empty_invited: "No invitations sent yet.",
		empty_arrivals: "No one has checked in yet.",
		show_table: "Show table",
		hide_table: "Hide table",
		budget_progress: "Budget and contributions",
		collected_vs_budget: "Collected / budget",
		collected_vs_pledged: "Collected / pledged",
		spent_vs_budget: "Spent / budget",
		cards_paid: "Cards paid for",
		no_subscription: "No cards paid for yet",
		pay_cards: "Pay for cards",
		pledged: "Pledged",
		paid: "Paid",
		balance: "Balance",
		status: "Status",
		st_full: "Fully paid",
		st_part: "Partly paid",
		st_none: "Not paid",
		add_contrib: "Add contributor",
		record_payment: "Record payment",
		import_excel: "Import Excel",
		export_excel: "Download Excel",
		send_reminders: "Send reminders",
		remind: "Remind",
		payments: "Contribution payments",
		date: "Date",
		amount: "Amount",
		method: "Method",
		reference: "Reference",
		notes: "Notes",
		no_contrib: "No contributors yet. Add one, or import your Excel list.",
		on_guest_list: "On the guest list",
		reminder_settings: "Contribution and reminder settings",
		deadline: "Contribution deadline",
		pay_instructions: "How to pay (e.g. M-Pesa 07XX XXX XXX, Name)",
		auto_add: "Add fully paid contributors to guests automatically",
		auto_remind: "Send reminders automatically",
		remind_every: "Remind every (days)",
		reminder_text: "Reminder message (leave blank for the default)",
		category: "Category",
		description: "Description",
		budgeted: "Budgeted",
		spent: "Spent",
		add_item: "Add item",
		total_budget: "Total budget",
		total_spent: "Spent",
		gap: "Gap (budget − contributions)",
		card_design: "Card design",
		upload_design: "Upload design (PNG/JPG from Canva)",
		uploading: "Uploading...",
		style: "Text style",
		font_size: "Name size",
		name_color: "Name colour",
		type_color: "Card type colour",
		font: "Font",
		make_preview: "Make preview",
		preview_hint: "The name, card type and QR go in the bottom-right corner. Leave space there in your design.",
		no_design: "You haven't uploaded a card design yet.",
		sample_card: "A real guest card",
		request_cards: "Request cards",
		how_many_cards: "How many cards?",
		quote_total: "Total",
		includes_credits: "Includes {0} SMS and {1} WhatsApp credits",
		locked_note: "{0} extra card(s) keep your earlier rate.",
		pay_now: "Pay now",
		pay_title: "Pay for cards",
		pay_phone: "Mobile money number (M-Pesa, Mixx, Airtel, HaloPesa)",
		accept_terms: "I accept the Terms & Conditions",
		check_phone: "Check your phone and enter your PIN to pay.",
		paid_ok: "Payment received! Your cards are unlocked and the receipt was sent on WhatsApp.",
		pay_failed: "The payment didn't go through. Please try again.",
		pay_wait: "Waiting for the payment confirmation. It will show here once confirmed.",
		sub_paid: "Paid",
		sub_pending: "Awaiting payment",
		sub_paying: "Waiting for PIN",
		sub_failed: "Payment failed",
		receipt: "Receipt",
		subscriptions: "Card packages",
		no_subs: "You haven't requested a card package yet.",
		gate_pin: "Gate PIN",
		gate_pin_hint: "Give it to your gate staff only. They enter it once on the gate page.",
		gate_link: "Gate link",
		open_gate: "Open the gate page",
		copy: "Copy",
		copied: "Copied",
		allow_reentry: "Allow entering more than once",
		recent_arrivals: "Recent arrivals",
		none_yet: "None yet.",
		details: "Event details",
		occasion_name: "Event name",
		host: "Hosts / organisers",
		occasion_date: "Date",
		occasion_time: "Time (as it should appear in messages)",
		venue: "Venue",
		venue_address: "Venue address",
		maps: "Google Maps link",
		dress_code: "Dress code",
		contact_1: "Contact 1",
		contact_2: "Contact 2",
		create: "Create event",
		created: "Event created",
		credits_needed: "Credits needed: {0}, you have: {1}",
		no_one_to_send: "Every guest has already been invited by {0}.",
		send_confirm: "Send the invitation to {0} guests by {1}?",
		result: "{0} succeeded, {1} failed",
		reminder_preview: "Message preview",
		channel: "Send by",
		both: "Both",
		terms_title: "The Terms & Conditions have changed",
		terms_body: "Please read and accept the new Terms & Conditions to continue.",
		read_terms: "Read the Terms & Conditions",
		accept: "I accept",
		file: "File (.xlsx or .csv)",
		template: "Download the template",
		import_done: "{0} added, {1} updated",
		contributor: "Contributor",
		required: "Fill in the required fields.",
		rsvp_Pending: "No reply yet",
		rsvp_Confirmed: "Coming",
		rsvp_Declined: "Not coming",
		error: "Something went wrong",
	};
	const t = (key, args) => {
		const text = (EC.lang === "en" ? EN[key] : SW[key]) || SW[key] || key;
		return (args || []).reduce((s, a, i) => s.split("{" + i + "}").join(a), text);
	};

	// ------------------------------------------------------------------ helpers
	const app = document.getElementById("portalApp");
	const modal = document.getElementById("portalModal");
	const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
	const fmt = (n) => Math.round(Number(n) || 0).toLocaleString("en-US");
	const money = (n) => "TZS " + fmt(n);
	const pct = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
	const today = () => new Date().toISOString().slice(0, 10);
	const P = "e_card_ms.api.portal.";
	const CARD_TYPES = ["SINGLE", "DOUBLE", "VIP", "TABLE"];
	const METHODS = ["Cash", "M-Pesa", "Mixx by Yas", "Airtel Money", "HaloPesa", "Bank", "Other"];
	const BUDGET_CATS = ["Ukumbi", "Chakula", "Vinywaji", "Mapambo", "Muziki / DJ", "Picha & Video", "Usafiri", "Mavazi", "Keki", "MC", "Nyingine"];

	const state = { home: null, occ: null, route: null, guestFilter: "all", guestSearch: "", contribFilter: "all", polling: null };

	function toast(message, kind) {
		const box = document.getElementById("portalToasts");
		const el = document.createElement("div");
		el.className = "ec-toast2 " + (kind || "ok");
		el.textContent = message;
		box.appendChild(el);
		setTimeout(() => el.classList.add("out"), 3800);
		setTimeout(() => el.remove(), 4300);
	}

	async function call(method, args, opts) {
		try {
			return await (opts && opts.get ? EC.get(method, args) : EC.post(method, args));
		} catch (err) {
			toast(err.message || t("error"), "err");
			throw err;
		}
	}

	function busy(btn, on) {
		if (!btn) return;
		btn.disabled = on;
		btn.classList.toggle("is-busy", on);
	}

	// ------------------------------------------------------------------ modal
	function openModal(title, body, { submitLabel, onSubmit, wide } = {}) {
		modal.className = "ec-modal" + (wide ? " wide" : "");
		modal.innerHTML = `
			<form method="dialog" class="ec-modal-box">
				<header><h2 id="portalModalTitle">${esc(title)}</h2>
					<button type="button" class="ec-icon-btn" data-close aria-label="${esc(t("close"))}">×</button></header>
				<div class="ec-modal-body">${body}</div>
				<footer>
					<button type="button" class="ec-btn ec-btn-ghost" data-close>${esc(onSubmit ? t("cancel") : t("close"))}</button>
					${onSubmit ? `<button type="submit" class="ec-btn ec-btn-primary" data-submit>${esc(submitLabel || t("save"))}</button>` : ""}
				</footer>
			</form>`;
		modal.querySelectorAll("[data-close]").forEach((b) => b.addEventListener("click", () => modal.close()));
		const form = modal.querySelector("form");
		form.addEventListener("submit", async (e) => {
			e.preventDefault();
			if (!onSubmit) return modal.close();
			if (!form.reportValidity()) return;
			const btn = form.querySelector("[data-submit]");
			busy(btn, true);
			try {
				const keep = await onSubmit(formValues(form), form);
				if (keep !== true) modal.close();
			} catch (err) {
				/* toast already shown */
			} finally {
				busy(btn, false);
			}
		});
		modal.showModal();
		const first = modal.querySelector("input:not([type=hidden]),select,textarea");
		if (first) first.focus();
		return form;
	}

	function formValues(form) {
		const out = {};
		form.querySelectorAll("[name]").forEach((el) => {
			if (el.type === "checkbox") out[el.name] = el.checked ? 1 : 0;
			else if (el.type === "number") out[el.name] = el.value === "" ? null : Number(el.value);
			else out[el.name] = el.value;
		});
		return out;
	}

	const field = (name, label, value, opts = {}) => {
		const id = "f_" + name;
		const req = opts.required ? "required" : "";
		let input;
		if (opts.type === "select") {
			input = `<select id="${id}" name="${name}" ${req}>${opts.options.map((o) => {
				const [v, l] = Array.isArray(o) ? o : [o, o];
				return `<option value="${esc(v)}" ${String(v) === String(value ?? "") ? "selected" : ""}>${esc(l)}</option>`;
			}).join("")}</select>`;
		} else if (opts.type === "textarea") {
			input = `<textarea id="${id}" name="${name}" rows="${opts.rows || 3}" ${req}>${esc(value)}</textarea>`;
		} else if (opts.type === "checkbox") {
			return `<label class="ec-check2"><input type="checkbox" name="${name}" ${value ? "checked" : ""}> <span>${esc(label)}</span></label>`;
		} else {
			input = `<input id="${id}" name="${name}" type="${opts.type || "text"}" value="${esc(value)}" ${req}
				${opts.min != null ? `min="${opts.min}"` : ""} ${opts.step ? `step="${opts.step}"` : ""} ${opts.placeholder ? `placeholder="${esc(opts.placeholder)}"` : ""}
				${opts.inputmode ? `inputmode="${opts.inputmode}"` : ""}>`;
		}
		return `<div class="ec-f ${opts.full ? "full" : ""}"><label for="${id}">${esc(label)}${opts.required ? " *" : ""}</label>${input}</div>`;
	};

	// ------------------------------------------------------------------ line chart (inline SVG)
	// Single series per chart (title names it, so no legend), categorical slot 1,
	// 2px line, 8px markers with a surface ring, crosshair + tooltip on hover,
	// and a table view for screen readers / exact values.
	function lineChart(points, { isMoney, label }) {
		const W = 560, H = 210, L = isMoney ? 70 : 40, R = 14, T = 14, B = 34;
		const max = Math.max(1, ...points.map((p) => p.y));
		const step = niceStep(max / 3);
		const top = Math.ceil(max / step) * step;
		const x = (i) => (points.length === 1 ? L + (W - L - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
		const y = (v) => T + (H - T - B) * (1 - v / top);
		const ticks = [];
		for (let v = 0; v <= top + 1e-9; v += step) ticks.push(v);
		const short = (v) => (isMoney ? (v >= 1e6 ? (v / 1e6).toFixed(v % 1e6 ? 1 : 0) + "M" : v >= 1e3 ? Math.round(v / 1e3) + "k" : fmt(v)) : fmt(v));
		const labelEvery = Math.max(1, Math.ceil(points.length / 6));
		const path = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.y).toFixed(1)}`).join(" ");
		const svg = `
			<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(label)}">
				${ticks.map((v) => `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>
					<text class="ytick" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${short(v)}</text>`).join("")}
				${points.map((p, i) => (i % labelEvery === 0 || i === points.length - 1)
					? `<text class="xtick" x="${x(i)}" y="${H - 10}" text-anchor="middle">${esc(shortX(p.x))}</text>` : "").join("")}
				<path class="line" d="${path}"/>
				${points.length <= 40 ? points.map((p, i) => `<circle class="dot" cx="${x(i)}" cy="${y(p.y)}" r="4"/>`).join("") : ""}
				<line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/>
				${points.map((p, i) => {
					const left = i ? (x(i - 1) + x(i)) / 2 : L;
					const right = i < points.length - 1 ? (x(i) + x(i + 1)) / 2 : W - R;
					return `<rect class="hit" x="${left}" y="${T}" width="${Math.max(1, right - left)}" height="${H - T - B}" data-i="${i}"/>`;
				}).join("")}
			</svg>`;
		const table = `<table class="ec-viz-table" hidden><thead><tr><th>${esc(t("date"))}</th><th class="num">${esc(label)}</th></tr></thead>
			<tbody>${points.map((p) => `<tr><td>${esc(p.x)}</td><td class="num">${isMoney ? money(p.y) : fmt(p.y)}</td></tr>`).join("")}</tbody></table>`;
		return { html: `<div class="ec-viz-plot">${svg}<div class="ec-viz-tip" hidden></div></div>${table}`, bind: (root) => bindHover(root, points, { x, y, isMoney }) };
	}
	function niceStep(raw) {
		const pow = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
		const n = raw / pow;
		return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow;
	}
	function shortX(x) {
		return /^\d{4}-\d{2}-\d{2}$/.test(x) ? x.slice(8, 10) + "/" + x.slice(5, 7) : x;
	}
	function bindHover(root, points, { x, y, isMoney }) {
		const svg = root.querySelector("svg");
		const tip = root.querySelector(".ec-viz-tip");
		const cross = svg.querySelector(".cross");
		svg.querySelectorAll(".hit").forEach((rect) => {
			rect.addEventListener("pointerenter", () => {
				const i = Number(rect.dataset.i);
				const p = points[i];
				cross.setAttribute("x1", x(i));
				cross.setAttribute("x2", x(i));
				cross.setAttribute("visibility", "visible");
				svg.querySelectorAll(".dot").forEach((d, j) => d.classList.toggle("on", j === i));
				tip.hidden = false;
				tip.innerHTML = `<span>${esc(p.x)}</span><b>${isMoney ? money(p.y) : fmt(p.y)}</b>`;
				const box = svg.getBoundingClientRect();
				const px = (x(i) / 560) * box.width;
				const py = (y(p.y) / 210) * box.height;
				tip.style.left = Math.min(Math.max(px, 60), box.width - 60) + "px";
				tip.style.top = Math.max(py - 12, 0) + "px";
			});
		});
		svg.addEventListener("pointerleave", () => {
			tip.hidden = true;
			cross.setAttribute("visibility", "hidden");
			svg.querySelectorAll(".dot.on").forEach((d) => d.classList.remove("on"));
		});
	}

	// ------------------------------------------------------------------ routing
	function parseRoute() {
		const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
		if (parts[0] === "new") return { view: "new" };
		if (parts[0] === "o" && parts[1]) return { view: "occasion", name: parts[1], tab: parts[2] || "overview" };
		return { view: "home" };
	}
	const occUrl = (name, tab) => `#/o/${encodeURIComponent(name)}/${tab || "overview"}`;

	async function route() {
		stopPolling();
		state.route = parseRoute();
		if (state.route.view === "home") return loadHome();
		if (state.route.view === "new") return renderNew();
		if (!state.occ || state.occ.doc.name !== state.route.name) {
			app.innerHTML = `<div class="ec-skeleton"><span></span><span></span><span></span></div>`;
			try {
				state.occ = await call(P + "get_occasion", { name: state.route.name }, { get: true });
			} catch (e) {
				app.innerHTML = `<p class="ec-empty">${esc(t("error"))}. <a href="#/">${esc(t("back"))}</a></p>`;
				return;
			}
		}
		renderOccasion();
	}
	window.addEventListener("hashchange", route);
	// Language switch: redraw what's on screen from memory, no refetch.
	document.addEventListener("ec:lang", () => {
		if (!state.route) return;
		if (state.route.view === "home" && state.home) renderHome();
		else if (state.route.view === "occasion" && state.occ) renderOccasion();
		else if (state.route.view === "new") renderNew();
	});

	// ------------------------------------------------------------------ home
	async function loadHome() {
		state.home = await call(P + "get_home", {}, { get: true });
		renderHome();
		if (state.home.terms_pending) showTerms();
	}

	function daysLeft(date) {
		if (!date) return "";
		const d = Math.round((new Date(date + "T00:00:00") - new Date(today() + "T00:00:00")) / 864e5);
		return d > 0 ? t("days_left", [d]) : d === 0 ? t("today") : t("past");
	}

	function renderHome() {
		const h = state.home;
		const name = (h.user && (h.user.full_name || h.user.email)) || "";
		app.innerHTML = `
			<div class="ec-ph">
				<div><h1>${esc(t("hello", [name.split(" ")[0]]))}</h1><p class="ec-lede">${esc(t("home_lede"))}</p></div>
				<a class="ec-btn ec-btn-primary" href="#/new">+ ${esc(t("new_event"))}</a>
			</div>
			<div class="ec-creditbar">
				<div><span>${esc(t("sms_credits"))}</span><b>${fmt(h.balances.sms_balance)}</b></div>
				<div><span>${esc(t("wa_credits"))}</span><b>${fmt(h.balances.whatsapp_balance)}</b></div>
				<a class="ec-btn ec-btn-ghost" href="/credits">${esc(t("buy_credits"))}</a>
			</div>
			${h.occasions.length ? `<div class="ec-occ-grid">${h.occasions.map(occCard).join("")}</div>`
				: `<div class="ec-empty"><p>${esc(t("no_events"))}</p><a class="ec-btn ec-btn-primary" href="#/new">${esc(t("new_event"))}</a></div>`}`;
	}

	function occCard(o) {
		const img = o.card_preview_image || o.card_design;
		return `<a class="ec-occ" href="${occUrl(o.name)}">
			<div class="ec-occ-img">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : `<span class="ec-occ-ph" aria-hidden="true"></span>`}</div>
			<div class="ec-occ-body">
				<span class="ec-pill">${esc(daysLeft(o.occasion_date))}</span>
				<h3>${esc(o.occasion_name)}</h3>
				<p>${esc(o.occasion_date || "")} · ${esc(o.venue_name || "")}</p>
				<dl>
					<div><dt>${esc(t("guests"))}</dt><dd>${fmt(o.guests)}</dd></div>
					<div><dt>${esc(t("confirmed"))}</dt><dd>${fmt(o.confirmed)}</dd></div>
					<div><dt>${esc(t("collected"))}</dt><dd>${money(o.total_collected)}</dd></div>
				</dl>
				${o.total_pledged ? `<div class="ec-bar" title="${pct(o.total_collected, o.total_pledged)}%"><i style="width:${pct(o.total_collected, o.total_pledged)}%"></i></div>` : ""}
			</div>
		</a>`;
	}

	// ------------------------------------------------------------------ new occasion
	function renderNew() {
		app.innerHTML = `
			<a class="ec-backlink" href="#/">← ${esc(t("back"))}</a>
			<h1>${esc(t("new_event"))}</h1>
			<form class="ec-card2 ec-form-grid" id="newForm">
				${field("occasion_name", t("occasion_name"), "", { required: true, placeholder: "Harusi ya Amina & Baraka" })}
				${field("couple_names", t("host"), "", { required: true, placeholder: "Amina & Baraka" })}
				${field("occasion_date", t("occasion_date"), "", { required: true, type: "date" })}
				${field("occasion_time", t("occasion_time"), "", { required: true, placeholder: "Saa 12:00 jioni" })}
				${field("venue_name", t("venue"), "", { required: true })}
				${field("venue_address", t("venue_address"), "")}
				<div class="ec-f full"><button class="ec-btn ec-btn-primary" type="submit">${esc(t("create"))}</button></div>
			</form>`;
		document.getElementById("newForm").addEventListener("submit", async (e) => {
			e.preventDefault();
			const btn = e.target.querySelector("button[type=submit]");
			busy(btn, true);
			try {
				const res = await call(P + "create_occasion", { values: formValues(e.target) });
				toast(t("created"));
				state.occ = null;
				location.hash = occUrl(res.name);
			} finally {
				busy(btn, false);
			}
		});
	}

	// ------------------------------------------------------------------ occasion shell
	const TABS = [
		["overview", "tab_overview"], ["guests", "tab_guests"], ["contrib", "tab_contrib"], ["budget", "tab_budget"],
		["card", "tab_card"], ["pay", "tab_pay"], ["gate", "tab_gate"], ["details", "tab_details"],
	];

	function renderOccasion() {
		const { doc } = state.occ;
		const tab = TABS.some(([k]) => k === state.route.tab) ? state.route.tab : "overview";
		app.innerHTML = `
			<a class="ec-backlink" href="#/">← ${esc(t("back"))}</a>
			<div class="ec-ph">
				<div>
					<h1>${esc(doc.occasion_name)}</h1>
					<p class="ec-lede">${esc(doc.occasion_date)} · ${esc(doc.occasion_time)} · ${esc(doc.venue_name)}
						<span class="ec-pill">${esc(daysLeft(doc.occasion_date))}</span></p>
				</div>
			</div>
			<nav class="ec-tabs2" aria-label="${esc(doc.occasion_name)}">
				${TABS.map(([k, label]) => `<a href="${occUrl(doc.name, k)}" ${k === tab ? 'aria-current="page"' : ""}>${esc(t(label))}</a>`).join("")}
			</nav>
			<div id="tabBody" class="ec-tabbody"></div>`;
		const body = document.getElementById("tabBody");
		({ overview, guests, contrib, budget, card, pay, gate, details })[tab](body);
		const current = app.querySelector('.ec-tabs2 [aria-current="page"]');
		if (current) current.scrollIntoView({ block: "nearest", inline: "center" });
		if (state.occ.terms_pending) showTerms();
	}

	function setOcc(payload) {
		state.occ = payload;
		renderOccasion();
	}

	async function saveRow(table, row, btn) {
		busy(btn, true);
		try {
			setOcc(await call(P + "save_row", { name: state.occ.doc.name, table, row }));
			toast(t("saved"));
		} finally {
			busy(btn, false);
		}
	}

	async function deleteRow(table, rowName) {
		if (!confirm(t("confirm_delete"))) return;
		setOcc(await call(P + "delete_row", { name: state.occ.doc.name, table, row_name: rowName }));
	}

	async function runAction(action, args, btn) {
		busy(btn, true);
		try {
			const res = await call(P + "run_action", { name: state.occ.doc.name, action, args: args || {} });
			setOcc(res.occasion);
			return res.result;
		} finally {
			busy(btn, false);
		}
	}

	function showResult(res) {
		if (!res) return;
		toast(t("result", [res.success, res.failed]), res.failed ? "warn" : "ok");
		if (res.errors && res.errors.length) {
			openModal(t("error"), `<ul class="ec-errlist">${res.errors.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>`);
		}
	}

	// ------------------------------------------------------------------ overview
	function overview(body) {
		const { doc, billing, timeseries: ts, invited_count } = state.occ;
		const g = doc.guests;
		const checked = g.filter((x) => x.checked_in).length;
		const confirmed = g.filter((x) => x.rsvp_status === "Confirmed").length;
		const tiles = [
			[t("guests"), fmt(g.length)],
			[t("confirmed"), fmt(confirmed)],
			[t("invited"), fmt(invited_count)],
			[t("checked_in"), fmt(checked)],
			[t("collected"), money(doc.total_collected)],
			[t("outstanding"), money(doc.outstanding_pledges)],
		];
		const charts = [
			["collected", t("chart_collected"), t("empty_collected"), true],
			["invited", t("chart_invited"), t("empty_invited"), false],
			["arrivals", ts.arrivals_by_time ? t("chart_arrivals_time") : t("chart_arrivals"), t("empty_arrivals"), false],
		];
		const built = {};
		body.innerHTML = `
			<div class="ec-tiles">${tiles.map(([l, v]) => `<div class="ec-tile"><span>${esc(l)}</span><b>${esc(v)}</b></div>`).join("")}</div>
			<div class="ec-billing">
				<div><span>${esc(t("cards_paid"))}</span><b>${billing.is_staff ? "—" : billing.capacity ? `${fmt(billing.capacity)} <small>/ ${fmt(billing.guests)} ${esc(t("guests").toLowerCase())}</small>` : esc(t("no_subscription"))}</b></div>
				<div><span>${esc(t("sms_credits"))}</span><b>${fmt(billing.balances.sms_balance)}</b></div>
				<div><span>${esc(t("wa_credits"))}</span><b>${fmt(billing.balances.whatsapp_balance)}</b></div>
				<div class="ec-billing-actions">
					<a class="ec-btn ec-btn-primary" href="${occUrl(doc.name, "pay")}">${esc(t("pay_cards"))}</a>
					<a class="ec-btn ec-btn-ghost" href="/credits">${esc(t("buy_credits"))}</a>
				</div>
			</div>
			<div class="ec-charts">
				${charts.map(([key, label, empty, isMoney]) => {
					const pts = ts[key] || [];
					if (!pts.length) return `<figure class="ec-viz"><figcaption>${esc(label)}</figcaption><p class="ec-viz-empty">${esc(empty)}</p></figure>`;
					built[key] = lineChart(pts, { isMoney, label });
					return `<figure class="ec-viz" data-key="${key}"><figcaption>${esc(label)}
						<button type="button" class="ec-linkbtn" data-toggle-table>${esc(t("show_table"))}</button></figcaption>${built[key].html}</figure>`;
				}).join("")}
			</div>
			${budgetBars(doc)}`;
		Object.entries(built).forEach(([key, chart]) => chart.bind(body.querySelector(`[data-key="${key}"]`)));
		body.querySelectorAll("[data-toggle-table]").forEach((btn) => btn.addEventListener("click", () => {
			const table = btn.closest("figure").querySelector(".ec-viz-table");
			table.hidden = !table.hidden;
			btn.textContent = table.hidden ? t("show_table") : t("hide_table");
		}));
	}

	function budgetBars(doc) {
		const rows = [];
		if (doc.total_budget) rows.push([t("collected_vs_budget"), doc.total_collected, doc.total_budget]);
		if (doc.total_pledged) rows.push([t("collected_vs_pledged"), doc.total_collected, doc.total_pledged]);
		if (doc.total_budget) rows.push([t("spent_vs_budget"), doc.total_spent, doc.total_budget]);
		if (!rows.length) return "";
		return `<section class="ec-card2"><h3>${esc(t("budget_progress"))}</h3>${rows.map(([l, a, b]) => `
			<div class="ec-progress"><div><span>${esc(l)}</span><span>${money(a)} / ${money(b)} · ${pct(a, b)}%</span></div>
			<div class="ec-bar"><i style="width:${pct(a, b)}%"></i></div></div>`).join("")}</section>`;
	}

	// ------------------------------------------------------------------ guests
	function guests(body) {
		const { doc } = state.occ;
		const q = state.guestSearch.toLowerCase();
		const rows = doc.guests.filter((g) => {
			if (q && !(`${g.guest_name} ${g.phone} ${g.guest_code}`.toLowerCase().includes(q))) return false;
			if (state.guestFilter === "notsent") return !g.sent_sms && !g.sent_whatsapp;
			if (state.guestFilter === "confirmed") return g.rsvp_status === "Confirmed";
			if (state.guestFilter === "checked") return g.checked_in;
			return true;
		});
		body.innerHTML = `
			<div class="ec-toolbar">
				<input type="search" id="guestSearch" placeholder="${esc(t("search"))}" value="${esc(state.guestSearch)}" aria-label="${esc(t("search"))}">
				<select id="guestFilter" aria-label="${esc(t("status"))}">
					${[["all", t("all")], ["notsent", t("not_sent")], ["confirmed", t("confirmed")], ["checked", t("checked_in")]]
						.map(([v, l]) => `<option value="${v}" ${state.guestFilter === v ? "selected" : ""}>${esc(l)}</option>`).join("")}
				</select>
				<span class="ec-grow"></span>
				<button class="ec-btn ec-btn-primary" data-act="add">+ ${esc(t("add_guest"))}</button>
				<button class="ec-btn ec-btn-ghost" data-act="cards">${esc(t("generate_cards"))}</button>
				<button class="ec-btn ec-btn-ghost" data-act="bulk" data-channel="WhatsApp">${esc(t("send_wa_all"))}</button>
				<button class="ec-btn ec-btn-ghost" data-act="bulk" data-channel="SMS">${esc(t("send_sms_all"))}</button>
			</div>
			${doc.guests.length ? `<div class="ec-tablewrap"><table class="ec-table">
				<thead><tr><th>${esc(t("name"))}</th><th>${esc(t("phone"))}</th><th>${esc(t("card_type"))}</th><th>${esc(t("code"))}</th>
					<th>${esc(t("rsvp"))}</th><th>${esc(t("sent"))}</th><th>${esc(t("gate"))}</th><th class="num">${esc(t("actions"))}</th></tr></thead>
				<tbody>${rows.map((g) => `<tr>
					<td><b>${esc(g.guest_name)}</b></td><td>${esc(g.phone)}</td><td>${esc(g.card_type)}</td><td><code>${esc(g.guest_code || "—")}</code></td>
					<td><span class="ec-pill ${g.rsvp_status === "Confirmed" ? "good" : g.rsvp_status === "Declined" ? "bad" : ""}">${esc(t("rsvp_" + (g.rsvp_status || "Pending")))}</span></td>
					<td>${g.sent_whatsapp ? '<span class="ec-chip">WA</span>' : ""}${g.sent_sms ? '<span class="ec-chip">SMS</span>' : ""}${!g.sent_whatsapp && !g.sent_sms ? "—" : ""}</td>
					<td>${g.checked_in ? "✓" : "—"}</td>
					<td class="num ec-rowacts">
						${g.card_image ? `<a class="ec-linkbtn" href="${esc(g.card_image)}" target="_blank">${esc(t("view_card"))}</a>` : `<button class="ec-linkbtn" data-act="card1" data-row="${esc(g.name)}">${esc(t("make_card"))}</button>`}
						<button class="ec-linkbtn" data-act="send1" data-channel="WhatsApp" data-code="${esc(g.guest_code)}">WhatsApp</button>
						<button class="ec-linkbtn" data-act="send1" data-channel="SMS" data-code="${esc(g.guest_code)}">SMS</button>
						<button class="ec-linkbtn" data-act="edit" data-row="${esc(g.name)}">${esc(t("edit"))}</button>
					</td></tr>`).join("")}</tbody></table></div>`
				: `<p class="ec-empty">${esc(t("no_guests"))}</p>`}`;

		const search = body.querySelector("#guestSearch");
		search.addEventListener("input", () => {
			state.guestSearch = search.value;
			const pos = search.selectionStart;
			guests(body);
			const again = body.querySelector("#guestSearch");
			again.focus();
			again.setSelectionRange(pos, pos);
		});
		body.querySelector("#guestFilter").addEventListener("change", (e) => { state.guestFilter = e.target.value; guests(body); });
		body.querySelectorAll("[data-act]").forEach((btn) => btn.addEventListener("click", () => guestAction(btn)));
	}

	function guestForm(g) {
		return `<div class="ec-form-grid">
			${field("guest_name", t("name"), g.guest_name, { required: true })}
			${field("phone", t("phone"), g.phone, { required: true, type: "tel", inputmode: "tel" })}
			${field("card_type", t("card_type"), g.card_type || "SINGLE", { type: "select", options: CARD_TYPES })}
			${field("rsvp_status", t("rsvp"), g.rsvp_status || "Pending", { type: "select", options: ["Pending", "Confirmed", "Declined"].map((v) => [v, t("rsvp_" + v)]) })}
		</div>`;
	}

	async function guestAction(btn) {
		const { doc } = state.occ;
		const act = btn.dataset.act;
		if (act === "add") {
			openModal(t("add_guest"), guestForm({}), { onSubmit: (v) => saveRow("guests", v) });
		} else if (act === "edit") {
			const g = doc.guests.find((x) => x.name === btn.dataset.row);
			const form = openModal(t("edit"), guestForm(g) + `<button type="button" class="ec-btn ec-btn-danger" data-del>${esc(t("delete"))}</button>`,
				{ onSubmit: (v) => saveRow("guests", { ...v, name: g.name }) });
			form.querySelector("[data-del]").addEventListener("click", async () => { modal.close(); await deleteRow("guests", g.name); });
		} else if (act === "cards") {
			showResult(await runAction("generate_all_cards", {}, btn));
		} else if (act === "card1") {
			busy(btn, true);
			try {
				await call("e_card_ms.utils.card_composer.compose_single_guest", { occasion_name: doc.name, guest_row_name: btn.dataset.row });
				setOcc(await call(P + "get_occasion", { name: doc.name }, { get: true }));
			} finally { busy(btn, false); }
		} else if (act === "send1") {
			const method = btn.dataset.channel === "SMS" ? "e_card_ms.api.sms.send_single" : "e_card_ms.api.whatsapp.send_single";
			busy(btn, true);
			try {
				await call(method, { occasion_name: doc.name, guest_code: btn.dataset.code });
				toast(t("saved"));
				setOcc(await call(P + "get_occasion", { name: doc.name }, { get: true }));
			} finally { busy(btn, false); }
		} else if (act === "bulk") {
			const channel = btn.dataset.channel;
			busy(btn, true);
			let est;
			try {
				est = await call("e_card_ms.api.messaging.estimate", { occasion_name: doc.name, channel, purpose: "Invitation" });
			} finally { busy(btn, false); }
			const c = est.channels[channel];
			if (!c.messages) return toast(t("no_one_to_send", [channel]), "warn");
			const short = est.billing && c.needed > c.available;
			openModal(channel, `<p>${esc(t("send_confirm", [c.messages, channel]))}</p>
				${est.billing ? `<p class="${short ? "ec-warn" : ""}">${esc(t("credits_needed", [fmt(c.needed), fmt(c.available)]))}</p>` : ""}
				${short ? `<p><a href="/credits">${esc(t("buy_credits"))}</a></p>` : ""}`, {
				submitLabel: channel === "SMS" ? t("send_sms") : t("send_wa"),
				onSubmit: async () => showResult(await runAction(channel === "SMS" ? "send_all_sms" : "send_all_whatsapp", {})),
			});
		}
	}

	// ------------------------------------------------------------------ contributions
	const statusPill = (s) => `<span class="ec-pill ${s === "Fully Paid" ? "good" : s === "Partially Paid" ? "warn" : "bad"}">${esc(s === "Fully Paid" ? t("st_full") : s === "Partially Paid" ? t("st_part") : t("st_none"))}</span>`;

	function contrib(body) {
		const { doc } = state.occ;
		const list = doc.contributors.filter((c) => state.contribFilter === "all" || c.payment_status === state.contribFilter);
		const fully = doc.contributors.filter((c) => c.payment_status === "Fully Paid").length;
		body.innerHTML = `
			<div class="ec-tiles">
				<div class="ec-tile"><span>${esc(t("pledged"))}</span><b>${money(doc.total_pledged)}</b></div>
				<div class="ec-tile"><span>${esc(t("collected"))}</span><b>${money(doc.total_collected)}</b></div>
				<div class="ec-tile"><span>${esc(t("outstanding"))}</span><b>${money(doc.outstanding_pledges)}</b></div>
				<div class="ec-tile"><span>${esc(t("st_full"))}</span><b>${fully} / ${doc.contributors.length}</b></div>
			</div>
			<div class="ec-toolbar">
				<select id="contribFilter" aria-label="${esc(t("status"))}">
					${[["all", t("all")], ["Not Paid", t("st_none")], ["Partially Paid", t("st_part")], ["Fully Paid", t("st_full")]]
						.map(([v, l]) => `<option value="${v}" ${state.contribFilter === v ? "selected" : ""}>${esc(l)}</option>`).join("")}
				</select>
				<span class="ec-grow"></span>
				<button class="ec-btn ec-btn-primary" data-act="add">+ ${esc(t("add_contrib"))}</button>
				<button class="ec-btn ec-btn-primary" data-act="pay">${esc(t("record_payment"))}</button>
				<button class="ec-btn ec-btn-ghost" data-act="import">${esc(t("import_excel"))}</button>
				<a class="ec-btn ec-btn-ghost" href="/api/method/e_card_ms.e_card.doctype.occasion.occasion.export_contributors?occasion=${encodeURIComponent(doc.name)}">${esc(t("export_excel"))}</a>
				<button class="ec-btn ec-btn-ghost" data-act="remind">${esc(t("send_reminders"))}</button>
			</div>
			${doc.contributors.length ? `<div class="ec-tablewrap"><table class="ec-table">
				<thead><tr><th>ID</th><th>${esc(t("name"))}</th><th>${esc(t("phone"))}</th><th class="num">${esc(t("pledged"))}</th>
					<th class="num">${esc(t("paid"))}</th><th class="num">${esc(t("balance"))}</th><th>${esc(t("status"))}</th><th class="num">${esc(t("actions"))}</th></tr></thead>
				<tbody>${list.map((c) => `<tr>
					<td><code>${esc(c.contributor_id)}</code></td>
					<td><b>${esc(c.contributor_name)}</b>${c.guest_code ? `<small class="ec-sub">✓ ${esc(t("on_guest_list"))}</small>` : ""}</td>
					<td>${esc(c.phone)}</td><td class="num">${fmt(c.pledged_amount)}</td><td class="num">${fmt(c.paid_amount)}</td>
					<td class="num">${fmt(c.balance)}</td><td>${statusPill(c.payment_status)}</td>
					<td class="num ec-rowacts">
						<button class="ec-linkbtn" data-act="pay" data-id="${esc(c.contributor_id)}">${esc(t("record_payment"))}</button>
						${c.balance > 0 && c.phone ? `<button class="ec-linkbtn" data-act="remind" data-id="${esc(c.contributor_id)}">${esc(t("remind"))}</button>` : ""}
						<button class="ec-linkbtn" data-act="edit" data-row="${esc(c.name)}">${esc(t("edit"))}</button>
					</td></tr>`).join("")}</tbody></table></div>` : `<p class="ec-empty">${esc(t("no_contrib"))}</p>`}

			${doc.contribution_payments.length ? `<h3 class="ec-h3">${esc(t("payments"))}</h3>
			<div class="ec-tablewrap"><table class="ec-table">
				<thead><tr><th>${esc(t("date"))}</th><th>${esc(t("contributor"))}</th><th class="num">${esc(t("amount"))}</th><th>${esc(t("method"))}</th><th>${esc(t("reference"))}</th><th></th></tr></thead>
				<tbody>${[...doc.contribution_payments].reverse().map((p) => `<tr>
					<td>${esc(p.payment_date)}</td><td>${esc(p.contributor_id)} · ${esc(p.contributor_name)}</td><td class="num">${fmt(p.amount)}</td>
					<td>${esc(p.method)}</td><td>${esc(p.reference || "")}</td>
					<td class="num"><button class="ec-linkbtn" data-act="delpay" data-row="${esc(p.name)}">${esc(t("delete"))}</button></td></tr>`).join("")}</tbody></table></div>` : ""}

			<form class="ec-card2 ec-form-grid" id="contribSettings">
				<h3 class="full">${esc(t("reminder_settings"))}</h3>
				${field("contribution_deadline", t("deadline"), doc.contribution_deadline, { type: "date" })}
				${field("payment_instructions", t("pay_instructions"), doc.payment_instructions)}
				${field("auto_add_paid_contributors", t("auto_add"), doc.auto_add_paid_contributors, { type: "checkbox" })}
				${field("auto_reminders", t("auto_remind"), doc.auto_reminders, { type: "checkbox" })}
				${field("reminder_interval_days", t("remind_every"), doc.reminder_interval_days || 7, { type: "number", min: 1 })}
				${field("reminder_template", t("reminder_text"), doc.reminder_template, { type: "textarea", full: true })}
				<div class="ec-f full"><button class="ec-btn ec-btn-primary" type="submit">${esc(t("save"))}</button></div>
			</form>`;
		body.querySelector("#contribFilter").addEventListener("change", (e) => { state.contribFilter = e.target.value; contrib(body); });
		body.querySelectorAll("[data-act]").forEach((btn) => btn.addEventListener("click", () => contribAction(btn)));
		body.querySelector("#contribSettings").addEventListener("submit", (e) => { e.preventDefault(); updateFields(formValues(e.target), e.submitter); });
	}

	function contribForm(c) {
		return `<div class="ec-form-grid">
			${field("contributor_name", t("name"), c.contributor_name, { required: true })}
			${field("phone", t("phone"), c.phone, { type: "tel", inputmode: "tel" })}
			${field("pledged_amount", t("pledged"), c.pledged_amount, { type: "number", min: 0, step: "any" })}
			${field("card_type", t("card_type"), c.card_type || "SINGLE", { type: "select", options: CARD_TYPES })}
		</div>`;
	}

	async function contribAction(btn) {
		const { doc } = state.occ;
		const act = btn.dataset.act;
		if (act === "add") {
			openModal(t("add_contrib"), contribForm({}), { onSubmit: (v) => saveRow("contributors", v) });
		} else if (act === "edit") {
			const c = doc.contributors.find((x) => x.name === btn.dataset.row);
			const form = openModal(t("edit"), contribForm(c) + `<button type="button" class="ec-btn ec-btn-danger" data-del>${esc(t("delete"))}</button>`,
				{ onSubmit: (v) => saveRow("contributors", { ...v, name: c.name }) });
			form.querySelector("[data-del]").addEventListener("click", async () => { modal.close(); await deleteRow("contributors", c.name); });
		} else if (act === "delpay") {
			await deleteRow("contribution_payments", btn.dataset.row);
		} else if (act === "pay") {
			if (!doc.contributors.length) return toast(t("no_contrib"), "warn");
			const options = doc.contributors.map((c) => [c.contributor_id, `${c.contributor_id} · ${c.contributor_name} · ${t("balance")} ${fmt(c.balance)}`]);
			openModal(t("record_payment"), `<div class="ec-form-grid">
				${field("contributor_id", t("contributor"), btn.dataset.id || options[0][0], { type: "select", options, full: true })}
				${field("amount", t("amount"), "", { type: "number", min: 1, step: "any", required: true })}
				${field("payment_date", t("date"), today(), { type: "date", required: true })}
				${field("payment_method", t("method"), "M-Pesa", { type: "select", options: METHODS })}
				${field("reference", t("reference"), "")}
				${field("notes", t("notes"), "", { type: "textarea", full: true, rows: 2 })}
			</div>`, {
				onSubmit: async (v) => {
					const res = await runAction("record_payment", v);
					toast(`${t("paid")} ${fmt(res.paid_amount)} · ${t("balance")} ${fmt(res.balance)}`);
				},
			});
		} else if (act === "import") {
			const form = openModal(t("import_excel"), `
				<p><a href="/api/method/e_card_ms.e_card.doctype.occasion.occasion.download_contributor_template">${esc(t("template"))}</a></p>
				<div class="ec-f full"><label for="importFile">${esc(t("file"))}</label><input id="importFile" type="file" accept=".xlsx,.xls,.csv" required></div>`, {
				submitLabel: t("import_excel"),
				onSubmit: async (_v, f) => {
					const file = f.querySelector("#importFile").files[0];
					const url = await uploadFile(file, "contributors_import");
					const res = await runAction("import_contributors", { file_url: url });
					toast(t("import_done", [res.added, res.updated]));
					if (res.skipped && res.skipped.length) openModal(t("error"), `<ul class="ec-errlist">${res.skipped.map((s) => `<li>${esc(s)}</li>`).join("")}</ul>`);
				},
			});
			return form;
		} else if (act === "remind") {
			reminderDialog(btn.dataset.id ? [btn.dataset.id] : null);
		}
	}

	async function reminderDialog(ids) {
		const { doc } = state.occ;
		const preview = await call("e_card_ms.api.reminders.preview", { occasion: doc.name, contributor_id: ids ? ids[0] : null }, { get: true });
		const form = openModal(t("send_reminders"), `
			<div class="ec-form-grid">
				${field("channel", t("channel"), "SMS", { type: "select", options: [["SMS", "SMS"], ["WhatsApp", "WhatsApp"], ["Both", t("both")]] })}
				${ids ? "" : field("not_paid", t("st_none"), 1, { type: "checkbox" }) + field("partially_paid", t("st_part"), 1, { type: "checkbox" })}
			</div>
			<p class="ec-label">${esc(t("reminder_preview"))}</p><div class="ec-preview">${esc(preview)}</div>
			<p class="ec-estimate" id="remEst"></p>`, {
			submitLabel: t("send_reminders"),
			onSubmit: async (v) => {
				const statuses = ids ? null : [v.not_paid && "Not Paid", v.partially_paid && "Partially Paid"].filter(Boolean);
				const res = await call("e_card_ms.api.reminders.send_reminders", { occasion: doc.name, channel: v.channel, statuses, contributor_ids: ids });
				showResult(res);
				setOcc(await call(P + "get_occasion", { name: doc.name }, { get: true }));
			},
		});
		const refresh = async () => {
			const v = formValues(form);
			const statuses = ids ? null : [v.not_paid && "Not Paid", v.partially_paid && "Partially Paid"].filter(Boolean);
			const est = await call("e_card_ms.api.messaging.estimate", { occasion_name: doc.name, channel: v.channel, purpose: "Reminder", statuses });
			form.querySelector("#remEst").textContent = est.billing
				? Object.entries(est.channels).map(([ch, c]) => `${ch}: ${c.messages} · ${t("credits_needed", [fmt(c.needed), fmt(c.available)])}`).join("  |  ")
				: "";
		};
		if (!ids) form.addEventListener("change", refresh);
		refresh();
	}

	async function uploadFile(file, fieldname) {
		const data = new FormData();
		data.append("file", file, file.name);
		data.append("is_private", fieldname === "card_design" ? "0" : "1");
		data.append("doctype", "Occasion");
		data.append("docname", state.occ.doc.name);
		data.append("fieldname", fieldname);
		const res = await fetch("/api/method/upload_file", {
			method: "POST", body: data, credentials: "same-origin",
			headers: { "X-Frappe-CSRF-Token": window.EC_CSRF || "", Accept: "application/json" },
		});
		const body = await res.json().catch(() => ({}));
		if (!res.ok || !body.message) {
			toast(t("error"), "err");
			throw new Error("upload failed");
		}
		return body.message.file_url;
	}

	async function updateFields(values, btn) {
		busy(btn, true);
		try {
			setOcc(await call(P + "update_occasion", { name: state.occ.doc.name, values }));
			toast(t("saved"));
		} finally {
			busy(btn, false);
		}
	}

	// ------------------------------------------------------------------ budget
	function budget(body) {
		const { doc } = state.occ;
		body.innerHTML = `
			<div class="ec-tiles">
				<div class="ec-tile"><span>${esc(t("total_budget"))}</span><b>${money(doc.total_budget)}</b></div>
				<div class="ec-tile"><span>${esc(t("total_spent"))}</span><b>${money(doc.total_spent)}</b></div>
				<div class="ec-tile"><span>${esc(t("collected"))}</span><b>${money(doc.total_collected)}</b></div>
				<div class="ec-tile"><span>${esc(t("gap"))}</span><b>${money(doc.funding_gap)}</b></div>
			</div>
			<div class="ec-toolbar"><span class="ec-grow"></span><button class="ec-btn ec-btn-primary" data-act="add">+ ${esc(t("add_item"))}</button></div>
			${doc.budget_items.length ? `<div class="ec-tablewrap"><table class="ec-table">
				<thead><tr><th>${esc(t("category"))}</th><th>${esc(t("description"))}</th><th class="num">${esc(t("budgeted"))}</th>
					<th class="num">${esc(t("spent"))}</th><th>%</th><th></th></tr></thead>
				<tbody>${doc.budget_items.map((b) => `<tr>
					<td><b>${esc(b.category)}</b></td><td>${esc(b.description || "")}</td>
					<td class="num">${fmt(b.budgeted_amount)}</td><td class="num">${fmt(b.actual_amount)}</td>
					<td style="min-width:110px"><div class="ec-bar"><i style="width:${pct(b.actual_amount, b.budgeted_amount)}%"></i></div></td>
					<td class="num"><button class="ec-linkbtn" data-act="edit" data-row="${esc(b.name)}">${esc(t("edit"))}</button></td></tr>`).join("")}</tbody></table></div>` : ""}
			${budgetBars(doc)}`;
		const form = (b) => `<div class="ec-form-grid">
			${field("category", t("category"), b.category || BUDGET_CATS[0], { type: "select", options: BUDGET_CATS })}
			${field("description", t("description"), b.description)}
			${field("budgeted_amount", t("budgeted"), b.budgeted_amount, { type: "number", min: 0, step: "any" })}
			${field("actual_amount", t("spent"), b.actual_amount, { type: "number", min: 0, step: "any" })}
			${field("notes", t("notes"), b.notes, { type: "textarea", full: true, rows: 2 })}</div>`;
		body.querySelectorAll("[data-act]").forEach((btn) => btn.addEventListener("click", () => {
			if (btn.dataset.act === "add") return openModal(t("add_item"), form({}), { onSubmit: (v) => saveRow("budget_items", v) });
			const b = doc.budget_items.find((x) => x.name === btn.dataset.row);
			const f = openModal(t("edit"), form(b) + `<button type="button" class="ec-btn ec-btn-danger" data-del>${esc(t("delete"))}</button>`,
				{ onSubmit: (v) => saveRow("budget_items", { ...v, name: b.name }) });
			f.querySelector("[data-del]").addEventListener("click", async () => { modal.close(); await deleteRow("budget_items", b.name); });
		}));
	}

	// ------------------------------------------------------------------ card
	function card(body) {
		const { doc } = state.occ;
		const preview = doc.card_preview_image || doc.card_design;
		const sample = doc.guests.find((g) => g.card_image);
		body.innerHTML = `
			<div class="ec-cardgrid">
				<section class="ec-card2">
					<h3>${esc(t("card_design"))}</h3>
					${preview ? `<img class="ec-cardprev" src="${esc(preview)}?t=${Date.now()}" alt="${esc(t("card_design"))}">` : `<p class="ec-empty">${esc(t("no_design"))}</p>`}
					<p class="ec-hint">${esc(t("preview_hint"))}</p>
					<div class="ec-f full"><label for="designFile">${esc(t("upload_design"))}</label><input id="designFile" type="file" accept="image/png,image/jpeg"></div>
				</section>
				<section class="ec-card2">
					<form class="ec-form-grid" id="styleForm">
						<h3 class="full">${esc(t("style"))}</h3>
						${field("name_font_size", t("font_size"), doc.name_font_size, { type: "number", min: 8 })}
						${field("name_font", t("font"), doc.name_font, { type: "select", options: ["Default", "Serif", "Sans-Serif"] })}
						${field("name_color", t("name_color"), doc.name_color || "#1A1A1A", { type: "color" })}
						${field("card_type_color", t("type_color"), doc.card_type_color || "#777777", { type: "color" })}
						<div class="ec-f full ec-btnrow">
							<button class="ec-btn ec-btn-ghost" type="submit">${esc(t("save"))}</button>
							<button class="ec-btn ec-btn-ghost" type="button" data-act="preview" ${doc.card_design ? "" : "disabled"}>${esc(t("make_preview"))}</button>
							<button class="ec-btn ec-btn-primary" type="button" data-act="cards" ${doc.card_design ? "" : "disabled"}>${esc(t("generate_cards"))}</button>
						</div>
					</form>
					${sample ? `<h3>${esc(t("sample_card"))} · ${esc(sample.guest_name)}</h3><img class="ec-cardprev" src="${esc(sample.card_image)}?t=${Date.now()}" alt="">` : ""}
				</section>
			</div>`;
		body.querySelector("#designFile").addEventListener("change", async (e) => {
			const file = e.target.files[0];
			if (!file) return;
			toast(t("uploading"));
			const url = await uploadFile(file, "card_design");
			setOcc(await call(P + "update_occasion", { name: doc.name, values: { card_design: url } }));
			toast(t("saved"));
		});
		body.querySelector("#styleForm").addEventListener("submit", (e) => { e.preventDefault(); updateFields(formValues(e.target), e.submitter); });
		body.querySelector('[data-act="preview"]').addEventListener("click", async (e) => {
			busy(e.target, true);
			try {
				await call(P + "update_occasion", { name: doc.name, values: formValues(body.querySelector("#styleForm")) });
				await call("e_card_ms.utils.card_composer.generate_preview", { occasion_name: doc.name });
				setOcc(await call(P + "get_occasion", { name: doc.name }, { get: true }));
			} finally { busy(e.target, false); }
		});
		body.querySelector('[data-act="cards"]').addEventListener("click", async (e) => showResult(await runAction("generate_all_cards", {}, e.target)));
	}

	// ------------------------------------------------------------------ payments (card subscription)
	function pay(body) {
		const { doc, billing, subscriptions } = state.occ;
		const pendingSub = subscriptions.find((s) => s.docstatus === 0);
		const label = (s) => s.docstatus === 1 ? t("sub_paid") : s.payment_status === "Pending" ? t("sub_paying") : s.payment_status === "Failed" ? t("sub_failed") : t("sub_pending");
		body.innerHTML = `
			<div class="ec-billing">
				<div><span>${esc(t("cards_paid"))}</span><b>${fmt(billing.capacity)} <small>/ ${fmt(billing.guests)} ${esc(t("guests").toLowerCase())}</small></b></div>
				<div><span>${esc(t("sms_credits"))}</span><b>${fmt(billing.balances.sms_balance)}</b></div>
				<div><span>${esc(t("wa_credits"))}</span><b>${fmt(billing.balances.whatsapp_balance)}</b></div>
				<div class="ec-billing-actions"><a class="ec-btn ec-btn-ghost" href="/credits">${esc(t("buy_credits"))}</a></div>
			</div>
			${pendingSub ? "" : `<form class="ec-card2 ec-quote" id="quoteForm">
				<h3>${esc(t("request_cards"))}</h3>
				<div class="ec-quote-row">
					${field("number_of_guests", t("how_many_cards"), Math.max(billing.guests - billing.capacity, 1), { type: "number", min: 1, required: true })}
					<div class="ec-quote-out" id="quoteOut" aria-live="polite"></div>
				</div>
				<button class="ec-btn ec-btn-primary" type="submit">${esc(t("request_cards"))}</button>
			</form>`}
			<h3 class="ec-h3">${esc(t("subscriptions"))}</h3>
			${subscriptions.length ? `<div class="ec-tablewrap"><table class="ec-table">
				<thead><tr><th>#</th><th>${esc(t("date"))}</th><th class="num">${esc(t("guests"))}</th><th class="num">${esc(t("amount"))}</th><th>${esc(t("status"))}</th><th class="num"></th></tr></thead>
				<tbody>${subscriptions.map((s) => `<tr>
					<td><code>${esc(s.name)}</code></td><td>${esc((s.creation || "").slice(0, 10))}</td>
					<td class="num">${fmt(s.number_of_guests)}</td><td class="num">${money(s.subscription_price)}</td>
					<td><span class="ec-pill ${s.docstatus === 1 ? "good" : s.payment_status === "Failed" ? "bad" : "warn"}">${esc(label(s))}</span></td>
					<td class="num">${s.docstatus === 1
						? `<a class="ec-linkbtn" href="/api/method/e_card_ms.receipts.download_receipt?doctype=Occasion%20Subscription&name=${encodeURIComponent(s.name)}">${esc(t("receipt"))}</a>`
						: `<button class="ec-btn ec-btn-sun" data-pay="${esc(s.name)}" data-amount="${s.subscription_price}">${esc(t("pay_now"))}</button>`}</td></tr>`).join("")}</tbody></table></div>`
				: `<p class="ec-empty">${esc(t("no_subs"))}</p>`}`;

		const qf = body.querySelector("#quoteForm");
		if (qf) {
			const input = qf.querySelector("[name=number_of_guests]");
			let timer = null;
			const quote = () => {
				clearTimeout(timer);
				timer = setTimeout(async () => {
					const n = parseInt(input.value, 10) || 0;
					if (n < 1) return;
					const q = await call("e_card_ms.utils.pricing.get_quote", { number_of_guests: n, occasion: doc.name }, { get: true });
					qf.querySelector("#quoteOut").innerHTML = `
						${q.lines.map((l) => `<div><span>${l.from_card}–${l.to_card}</span><span>${fmt(l.cards)} × ${fmt(l.price_per_card)}</span></div>`).join("")}
						${q.locked_cards ? `<small>${esc(t("locked_note", [q.locked_cards]))}</small>` : ""}
						<b>${esc(t("quote_total"))}: ${money(q.price)}</b>
						<small>${esc(t("includes_credits", [fmt(q.sms_credits), fmt(q.whatsapp_credits)]))}</small>`;
				}, 250);
			};
			input.addEventListener("input", quote);
			quote();
			qf.addEventListener("submit", async (e) => {
				e.preventDefault();
				const res = await runAction("request_subscription", { number_of_guests: parseInt(input.value, 10) }, qf.querySelector("button[type=submit]"));
				payDialog(res.name, res.price);
			});
		}
		body.querySelectorAll("[data-pay]").forEach((btn) => btn.addEventListener("click", () => payDialog(btn.dataset.pay, Number(btn.dataset.amount))));
	}

	function payDialog(subscription, amount) {
		openModal(t("pay_title"), `
			<p class="ec-paytotal">${money(amount)}</p>
			${field("phone", t("pay_phone"), "", { type: "tel", inputmode: "tel", required: true, placeholder: "07XX XXX XXX" })}
			${field("accept_terms", t("accept_terms"), 0, { type: "checkbox" })}
			<p class="ec-hint"><a href="/terms" target="_blank">${esc(t("read_terms"))}</a></p>
			<div class="ec-paystate" id="payState" hidden></div>`, {
			submitLabel: t("pay_now"),
			onSubmit: async (v, form) => {
				if (!v.accept_terms) { toast(t("accept_terms"), "warn"); return true; }
				const res = await call("e_card_ms.api.payments.pay_subscription", { subscription, phone: v.phone, accept_terms: 1 });
				const box = form.querySelector("#payState");
				box.hidden = false;
				box.textContent = res.message;
				form.querySelector("[data-submit]").hidden = true;
				if (!res.manual) pollSubscription(subscription, box);
				return true;
			},
		});
	}

	function stopPolling() {
		clearTimeout(state.polling);
		state.polling = null;
	}

	function pollSubscription(subscription, box, attempt = 0) {
		if (attempt > 45) { box.textContent = t("pay_wait"); return; }
		state.polling = setTimeout(async () => {
			try {
				const s = await EC.get("e_card_ms.api.payments.get_subscription_payment_status", { subscription });
				if (s.paid) {
					box.textContent = t("paid_ok");
					box.classList.add("ok");
					setOcc(await call(P + "get_occasion", { name: state.occ.doc.name }, { get: true }));
					toast(t("paid_ok"));
					return;
				}
				if (s.payment_status === "Failed") { box.textContent = t("pay_failed"); box.classList.add("err"); return; }
			} catch (e) { /* keep polling through network blips */ }
			pollSubscription(subscription, box, attempt + 1);
		}, 4000);
	}

	// ------------------------------------------------------------------ gate
	function gate(body) {
		const { doc, gate_url } = state.occ;
		const arrivals = doc.guests.filter((g) => g.checked_in).sort((a, b) => String(b.check_in_time).localeCompare(String(a.check_in_time)));
		body.innerHTML = `
			<div class="ec-gategrid">
				<section class="ec-card2 ec-pinbox">
					<span>${esc(t("gate_pin"))}</span>
					<b>${esc(doc.gate_pin || "—")}</b>
					<p class="ec-hint">${esc(t("gate_pin_hint"))}</p>
				</section>
				<section class="ec-card2">
					<h3>${esc(t("gate_link"))}</h3>
					<div class="ec-copyrow"><input readonly value="${esc(gate_url)}" aria-label="${esc(t("gate_link"))}">
						<button class="ec-btn ec-btn-ghost" data-act="copy">${esc(t("copy"))}</button></div>
					<a class="ec-btn ec-btn-primary" href="${esc(gate_url)}" target="_blank">${esc(t("open_gate"))}</a>
					<form id="gateForm" class="ec-gateform">${field("allow_reentry", t("allow_reentry"), doc.allow_reentry, { type: "checkbox" })}</form>
				</section>
			</div>
			<section class="ec-card2">
				<div class="ec-progress"><div><span>${esc(t("checked_in"))}</span><span>${arrivals.length} / ${doc.guests.length}</span></div>
					<div class="ec-bar"><i style="width:${pct(arrivals.length, doc.guests.length)}%"></i></div></div>
				<h3>${esc(t("recent_arrivals"))}</h3>
				${arrivals.length ? `<ul class="ec-arrivals">${arrivals.slice(0, 15).map((g) => `<li><b>${esc(g.guest_name)}</b><span>${esc(g.card_type)}</span><time>${esc(String(g.check_in_time || "").slice(11, 16))}</time></li>`).join("")}</ul>` : `<p class="ec-empty">${esc(t("none_yet"))}</p>`}
			</section>`;
		body.querySelector('[data-act="copy"]').addEventListener("click", async () => {
			try { await navigator.clipboard.writeText(gate_url); toast(t("copied")); } catch (e) { body.querySelector(".ec-copyrow input").select(); }
		});
		body.querySelector("#gateForm input").addEventListener("change", (e) => updateFields({ allow_reentry: e.target.checked ? 1 : 0 }));
	}

	// ------------------------------------------------------------------ details
	function details(body) {
		const { doc } = state.occ;
		body.innerHTML = `
			<form class="ec-card2 ec-form-grid" id="detailsForm">
				<h3 class="full">${esc(t("details"))}</h3>
				${field("couple_names", t("host"), doc.couple_names, { required: true })}
				${field("occasion_date", t("occasion_date"), doc.occasion_date, { type: "date", required: true })}
				${field("occasion_time", t("occasion_time"), doc.occasion_time, { required: true })}
				${field("venue_name", t("venue"), doc.venue_name, { required: true })}
				${field("venue_address", t("venue_address"), doc.venue_address, { type: "textarea", rows: 2 })}
				${field("venue_location", t("maps"), doc.venue_location, { type: "url" })}
				${field("dress_code", t("dress_code"), doc.dress_code)}
				${field("status", t("status"), doc.status, { type: "select", options: ["Draft", "Active", "Completed"] })}
				${field("contact_1", t("contact_1"), doc.contact_1, { type: "tel" })}
				${field("contact_2", t("contact_2"), doc.contact_2, { type: "tel" })}
				<div class="ec-f full"><button class="ec-btn ec-btn-primary" type="submit">${esc(t("save"))}</button></div>
			</form>`;
		body.querySelector("#detailsForm").addEventListener("submit", (e) => { e.preventDefault(); updateFields(formValues(e.target), e.submitter); });
	}

	// ------------------------------------------------------------------ terms
	function showTerms() {
		if (modal.open) return;
		openModal(t("terms_title"), `<p>${esc(t("terms_body"))}</p><p><a href="/terms" target="_blank">${esc(t("read_terms"))}</a></p>
			${field("agree", t("accept_terms"), 0, { type: "checkbox" })}`, {
			submitLabel: t("accept"),
			onSubmit: async (v) => {
				if (!v.agree) { toast(t("accept_terms"), "warn"); return true; }
				await call("e_card_ms.api.auth.accept_terms", {});
				if (state.home) state.home.terms_pending = false;
				if (state.occ) state.occ.terms_pending = false;
			},
		});
	}

	document.addEventListener("DOMContentLoaded", route);
})();
