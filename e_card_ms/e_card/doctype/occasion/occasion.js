frappe.ui.form.on("Occasion", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.call("get_invited_count").then(r => {
                render_occasion_statistics(frm, r.message || 0);
            });
            refresh_billing_status(frm);
        }
        set_payment_contributor_options(frm);
    },

    contributors_on_form_rendered(frm) {
        set_payment_contributor_options(frm);
    },

    open_gate_checkin_btn(frm) {
        if (frm.is_new()) {
            frappe.msgprint(__("Save the Occasion first."));
            return;
        }
        frappe.msgprint({
            title: __("Gate Check-in"),
            indicator: "blue",
            message: __("Gate PIN: <b style='font-size:18px;letter-spacing:3px'>{0}</b><br>Share it only with your gate staff. They enter it once on the check-in page.", [frm.doc.gate_pin || "—"])
        });
        window.open(`/gate-checkin?occasion=${encodeURIComponent(frm.doc.name)}`, "_blank");
    },

    generate_cards_btn(frm) {
        frappe.confirm(
            __("Generate/regenerate QR code cards for all guests?"),
            function () {
                with_saved(frm, () => {
                    frappe.show_alert({ message: __("Generating cards..."), indicator: "blue" });
                    frm.call("generate_all_cards").then(r => {
                        show_bulk_result(r.message, __("Done"), __("Errors"));
                        frm.reload_doc();
                    });
                });
            }
        );
    },

    send_whatsapp_btn(frm) {
        confirm_bulk_send(frm, "WhatsApp", "send_all_whatsapp");
    },

    send_sms_btn(frm) {
        confirm_bulk_send(frm, "SMS", "send_all_sms");
    },

    buy_credits_btn() {
        window.open("/credits", "_blank");
    },

    request_subscription_btn(frm) {
        with_saved(frm, () => frm.call("get_billing_status").then(r => {
            const s = r.message;
            if (s.pending_requests.length) {
                frappe.msgprint(__("Your request {0} is waiting for approval.", [s.pending_requests[0].name]));
                return;
            }
            const d = new frappe.ui.Dialog({
                title: __("Request Card Subscription / Lipia Kadi"),
                fields: [
                    {
                        fieldtype: "HTML",
                        options: `<p class="text-muted">${__("Cards already paid for: {0}. Guests on the list: {1}.", [s.capacity, s.guests])}</p>`
                    },
                    {
                        fieldname: "number_of_guests", fieldtype: "Int", label: __("Number of guest cards"), reqd: 1,
                        default: Math.max(s.guests - s.capacity, 1),
                        onchange() { update_price(); }
                    },
                    { fieldname: "price_html", fieldtype: "HTML" }
                ],
                primary_action_label: __("Send Request"),
                primary_action(values) {
                    frm.call("request_subscription", { number_of_guests: values.number_of_guests }).then(res => {
                        d.hide();
                        frappe.msgprint({
                            title: __("Request sent"),
                            indicator: "green",
                            message: __("Request {0} for TZS {1} was sent. You will be able to generate and send cards once it is approved.",
                                [res.message.name, format_number(res.message.price, null, 0)])
                        });
                        refresh_billing_status(frm);
                    });
                }
            });
            const update_price = () => {
                const n = d.get_value("number_of_guests") || 0;
                if (n <= 0) {
                    d.fields_dict.price_html.$wrapper.html("");
                    return;
                }
                frappe.call({
                    method: "e_card_ms.utils.pricing.get_quote",
                    args: { number_of_guests: n, occasion: frm.doc.name }
                }).then(r => {
                    const q = r.message;
                    const locked = q.locked_cards
                        ? `<div class="text-muted small">${__("{0} extra card(s) keep your current rate.", [q.locked_cards])}</div>` : "";
                    const lines = locked + q.lines.map(l =>
                        `<div class="text-muted">${__("Cards {0}–{1}", [l.from_card, l.to_card])}: ${l.cards} × TZS ${format_number(l.price_per_card, null, 0)}</div>`
                    ).join("");
                    d.fields_dict.price_html.$wrapper.html(`
                        ${lines}
                        <div style="font-size:16px;font-weight:700;margin-top:6px">${__("Total")}: TZS ${format_number(q.price, null, 0)}</div>
                        <div class="text-muted small">${__("Includes {0} SMS and {1} WhatsApp credits, added when approved.", [q.sms_credits, q.whatsapp_credits])}</div>`);
                });
            };
            d.show();
            update_price();
        }));
    },

    record_payment_btn(frm) {
        open_payment_dialog(frm);
    },

    add_paid_to_guests_btn(frm) {
        with_saved(frm, () => frm.call("add_paid_contributors_to_guests").then(r => {
            frappe.show_alert({ message: __("{0} contributor(s) added to Guests", [r.message || 0]), indicator: "green" });
            frm.reload_doc();
        }));
    },

    import_contributors_btn(frm) {
        with_saved(frm, () => {
            const d = new frappe.ui.Dialog({
                title: __("Import Contributors"),
                fields: [
                    {
                        fieldtype: "HTML",
                        options: `<p>${__("Columns: Name, Phone, Pledge, Card Type, Paid so far. Existing contributors (same phone) are updated, not duplicated.")}</p>
                            <p><a href="/api/method/e_card_ms.e_card.doctype.occasion.occasion.download_contributor_template">${__("Download the Excel template")}</a></p>`
                    },
                    { fieldname: "file", fieldtype: "Attach", label: __("Excel / CSV file"), reqd: 1 }
                ],
                primary_action_label: __("Import"),
                primary_action(values) {
                    frm.call({ method: "import_contributors", doc: frm.doc, args: { file_url: values.file }, freeze: true })
                        .then(r => {
                            d.hide();
                            const res = r.message;
                            let msg = __("Added: {0}, Updated: {1}", [res.added, res.updated]);
                            if (res.skipped.length) {
                                msg += "<br><br>" + __("Skipped:") + "<br>" + res.skipped.map(frappe.utils.escape_html).join("<br>");
                            }
                            frappe.msgprint({ title: __("Import finished"), message: msg, indicator: res.skipped.length ? "orange" : "green" });
                            frm.reload_doc();
                        });
                }
            });
            d.show();
        });
    },

    export_contributors_btn(frm) {
        if (frm.is_new()) return;
        window.open(
            `/api/method/e_card_ms.e_card.doctype.occasion.occasion.export_contributors?occasion=${encodeURIComponent(frm.doc.name)}`
        );
    },

    send_reminders_btn(frm) {
        open_reminder_dialog(frm);
    }
});

frappe.ui.form.on("Occasion Contributor", {
    record_payment(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        open_payment_dialog(frm, row.contributor_id);
    },

    send_reminder(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        if (!row.contributor_id) {
            frappe.msgprint(__("Save the Occasion first."));
            return;
        }
        open_reminder_dialog(frm, [row.contributor_id]);
    },

    contributors_add(frm) {
        set_payment_contributor_options(frm);
    },

    contributors_remove(frm) {
        set_payment_contributor_options(frm);
    }
});

frappe.ui.form.on("Occasion Contribution Payment", {
    contributor_id(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        const c = (frm.doc.contributors || []).find(c => c.contributor_id === row.contributor_id);
        frappe.model.set_value(cdt, cdn, "contributor_name", c ? c.contributor_name : "");
    }
});

// ------------------------------------------------------------------ helpers

function with_saved(frm, fn) {
    if (frm.is_new() || frm.is_dirty()) {
        frm.save().then(fn);
    } else {
        fn();
    }
}

function show_bulk_result(res, done_label, error_title) {
    frappe.show_alert({
        message: `${done_label}: ${res.success} ${__("success")}, ${res.failed} ${__("failed")}`,
        indicator: res.failed > 0 ? "orange" : "green"
    });
    if (res.errors.length) {
        frappe.msgprint({
            title: error_title,
            message: res.errors.map(frappe.utils.escape_html).join("<br>"),
            indicator: "red"
        });
    }
}

function credit_line(channel, c, billing) {
    if (!billing) return `${channel}: ${c.messages} ${__("message(s)")}`;
    const short = c.needed > c.available;
    return `<div style="margin:4px 0">${channel}: <b>${c.messages}</b> ${__("message(s)")} ·
        ${__("credits needed")} <b>${c.needed}</b> · ${__("available")}
        <b style="color:${short ? "var(--red-600, #d03b3b)" : "inherit"}">${c.available}</b></div>`;
}

function confirm_bulk_send(frm, channel, method) {
    with_saved(frm, () => frappe.call({
        method: "e_card_ms.api.messaging.estimate",
        args: { occasion_name: frm.doc.name, channel, purpose: "Invitation" }
    }).then(r => {
        const est = r.message;
        const c = est.channels[channel];
        if (!c.messages) {
            frappe.msgprint(__("Every guest has already received a {0} invitation.", [channel]));
            return;
        }
        let html = credit_line(channel, c, est.billing);
        if (est.billing && c.needed > c.available) {
            html += `<p style="margin-top:8px">${__("Not enough credits — only the first messages will go out.")}
                <a href="/credits" target="_blank">${__("Buy credits")}</a></p>`;
        }
        frappe.confirm(`${__("Send {0} invitations to all unsent guests?", [channel])}<br><br>${html}`, () => {
            frappe.show_alert({ message: __("Sending..."), indicator: "blue" });
            frm.call(method).then(res => {
                show_bulk_result(res.message, __("Sent"), __("{0} Errors", [channel]));
                refresh_billing_status(frm);
            });
        });
    }));
}

function contributor_options(frm) {
    return (frm.doc.contributors || [])
        .filter(c => c.contributor_id)
        .map(c => ({
            value: c.contributor_id,
            label: `${c.contributor_id} · ${c.contributor_name}${c.phone ? " · " + c.phone : ""} · ${__("Balance")} ${format_number(c.balance || 0, null, 0)}`
        }));
}

function set_payment_contributor_options(frm) {
    const grid = frm.fields_dict.contribution_payments && frm.fields_dict.contribution_payments.grid;
    if (!grid) return;
    const ids = (frm.doc.contributors || []).map(c => c.contributor_id).filter(Boolean);
    grid.update_docfield_property("contributor_id", "options", [""].concat(ids).join("\n"));
}

function open_payment_dialog(frm, contributor_id) {
    with_saved(frm, () => {
        const options = contributor_options(frm);
        if (!options.length) {
            frappe.msgprint(__("Add contributors first, then save."));
            return;
        }
        const d = new frappe.ui.Dialog({
            title: __("Rekodi Malipo / Record Payment"),
            fields: [
                { fieldname: "contributor_id", fieldtype: "Autocomplete", label: __("Contributor"), options, reqd: 1, default: contributor_id },
                { fieldname: "amount", fieldtype: "Currency", label: __("Amount"), reqd: 1 },
                { fieldname: "col", fieldtype: "Column Break" },
                { fieldname: "payment_date", fieldtype: "Date", label: __("Date"), default: frappe.datetime.get_today(), reqd: 1 },
                {
                    fieldname: "payment_method", fieldtype: "Select", label: __("Method"), default: "M-Pesa",
                    options: "Cash\nM-Pesa\nMixx by Yas\nAirtel Money\nHaloPesa\nBank\nOther"
                },
                { fieldname: "sec", fieldtype: "Section Break" },
                { fieldname: "reference", fieldtype: "Data", label: __("Reference (transaction ID)") },
                { fieldname: "notes", fieldtype: "Small Text", label: __("Notes") }
            ],
            primary_action_label: __("Save Payment"),
            primary_action(values) {
                frm.call("record_payment", values).then(r => {
                    d.hide();
                    const res = r.message;
                    let msg = __("Paid {0}, balance {1} — {2}", [
                        format_number(res.paid_amount, null, 0), format_number(res.balance, null, 0), __(res.payment_status)
                    ]);
                    if (res.payment_status === "Fully Paid" && res.guest_code) {
                        msg += " · " + __("added to Guests");
                    }
                    frappe.show_alert({ message: msg, indicator: "green" }, 7);
                    frm.reload_doc();
                });
            }
        });
        d.show();
    });
}

function open_reminder_dialog(frm, contributor_ids) {
    with_saved(frm, () => {
        let d = null;
        d = new frappe.ui.Dialog({
            title: contributor_ids ? __("Send Reminder") : __("Send Contribution Reminders"),
            fields: [
                {
                    fieldname: "channel", fieldtype: "Select", label: __("Send by"), default: "SMS",
                    options: "SMS\nWhatsApp\nBoth", onchange: () => refresh_estimate()
                },
                {
                    fieldname: "not_paid", fieldtype: "Check", label: __("Not Paid"), default: 1,
                    hidden: !!contributor_ids, onchange: () => refresh_estimate()
                },
                {
                    fieldname: "partially_paid", fieldtype: "Check", label: __("Partially Paid"), default: 1,
                    hidden: !!contributor_ids, onchange: () => refresh_estimate()
                },
                { fieldname: "preview_html", fieldtype: "HTML" },
                { fieldname: "estimate_html", fieldtype: "HTML" }
            ],
            primary_action_label: __("Send"),
            primary_action(values) {
                frappe.call({
                    method: "e_card_ms.api.reminders.send_reminders",
                    args: {
                        occasion: frm.doc.name,
                        channel: values.channel,
                        statuses: statuses(),
                        contributor_ids: contributor_ids || null
                    },
                    freeze: true,
                    freeze_message: __("Sending reminders...")
                }).then(r => {
                    d.hide();
                    show_bulk_result(r.message, __("Reminders sent"), __("Reminder Errors"));
                    frm.reload_doc();
                });
            }
        });
        const statuses = () => {
            const s = [];
            if (d.get_value("not_paid")) s.push("Not Paid");
            if (d.get_value("partially_paid")) s.push("Partially Paid");
            return s;
        };
        const refresh_estimate = () => {
            // onchange also fires while the dialog is still being built.
            if (!d || !d.get_value("channel")) return;
            frappe.call({
                method: "e_card_ms.api.messaging.estimate",
                args: { occasion_name: frm.doc.name, channel: d.get_value("channel"), purpose: "Reminder", statuses: statuses() }
            }).then(r => {
                const est = r.message;
                let html = "";
                for (const [ch, c] of Object.entries(est.channels)) html += credit_line(ch, c, est.billing);
                if (contributor_ids) html = "";  // single-contributor send: estimate covers everyone, skip it
                d.fields_dict.estimate_html.$wrapper.html(html);
            });
        };
        frappe.call({
            method: "e_card_ms.api.reminders.preview",
            args: { occasion: frm.doc.name, contributor_id: contributor_ids ? contributor_ids[0] : null }
        }).then(r => {
            d.fields_dict.preview_html.$wrapper.html(
                `<label class="control-label">${__("Message preview")}</label>
                 <div style="white-space:pre-wrap;padding:10px;border-radius:8px;background:var(--control-bg);font-size:13px">${frappe.utils.escape_html(r.message)}</div>`
            );
        });
        d.show();
        refresh_estimate();
    });
}

function refresh_billing_status(frm) {
    const field = frm.get_field("subscription_status_html");
    if (!field) return;
    frm.call("get_billing_status").then(r => {
        const s = r.message;
        const pending = s.pending_requests.length
            ? `<div class="text-warning">${__("Request {0} waiting for approval", [s.pending_requests[0].name])}</div>` : "";
        const cards = s.is_staff
            ? __("Staff account — no card subscription needed")
            : s.capacity
                ? __("Cards paid for: <b>{0}</b> (guests on list: {1})", [s.capacity, s.guests])
                : `<span class="text-danger">${__("No approved card subscription yet")}</span>`;
        field.$wrapper.html(`
            <div style="line-height:1.9">
                <div>${cards}</div>${pending}
                <div>${__("SMS credits")}: <b>${s.balances.sms_balance}</b> · ${__("WhatsApp credits")}: <b>${s.balances.whatsapp_balance}</b></div>
            </div>`);
    });
}

function render_occasion_statistics(frm, invitedCount) {
    const $wrapper = frm.get_field("statistics_html").$wrapper;
    const guests = frm.doc.guests || [];

    const total     = guests.length;
    const confirmed = guests.filter(g => g.rsvp_status === "Confirmed").length;
    const pending    = guests.filter(g => g.rsvp_status === "Pending").length;
    const declined   = guests.filter(g => g.rsvp_status === "Declined").length;
    const sent       = invitedCount || 0;
    const checkedIn  = guests.filter(g => g.checked_in).length;

    // Validated categorical/status palette — see dataviz skill references/palette.md.
    // Stat tiles use text-safe steps; the two pies use the fixed status triad
    // (good/warning/critical) and a highlight-vs-neutral pair, both legend-labeled.
    const stats = [
        { label: __("Total Guests"),   value: total,     v: "--stat-blue" },
        { label: __("Confirmed"),      value: confirmed, v: "--stat-good" },
        { label: __("Pending"),        value: pending,   v: "--stat-orange" },
        { label: __("Declined"),       value: declined,  v: "--stat-critical" },
        { label: __("Invited"),        value: sent,       v: "--stat-aqua" },
        { label: __("Checked In"),     value: checkedIn, v: "--stat-yellow" }
    ];

    const cardsHtml = stats
        .map(
            s => `
        <div class="occ-stat-card">
            <div class="occ-stat-num" style="color:var(${s.v});">${s.value}</div>
            <div class="occ-stat-label">${s.label}</div>
        </div>`
        )
        .join("");

    $wrapper.html(`
        <style>
            .occasion-stats {
                --stat-blue:     #2a78d6;
                --stat-orange:   #eb6834;
                --stat-aqua:     #1baf7a;
                --stat-yellow:   #eda100;
                --stat-good:     #006300;
                --stat-warning:  #fab219;
                --stat-critical: #d03b3b;
                --stat-neutral:  #c3c2b7;
                padding: 6px 0 16px;
            }
            @media (prefers-color-scheme: dark) {
                :root:where(:not([data-theme="light"])) .occasion-stats {
                    --stat-blue: #3987e5; --stat-orange: #d95926; --stat-aqua: #199e70;
                    --stat-yellow: #c98500; --stat-good: #0ca30c; --stat-warning: #fab219;
                    --stat-critical: #d03b3b; --stat-neutral: #383835;
                }
            }
            [data-theme="dark"] .occasion-stats {
                --stat-blue: #3987e5; --stat-orange: #d95926; --stat-aqua: #199e70;
                --stat-yellow: #c98500; --stat-good: #0ca30c; --stat-warning: #fab219;
                --stat-critical: #d03b3b; --stat-neutral: #383835;
            }
            .occ-stat-row { display:flex; gap:12px; flex-wrap:wrap; margin-bottom:22px; }
            .occ-stat-card {
                flex:1; min-width:130px; background:var(--card-bg,#fff);
                border:1px solid var(--border-color,#d1d5db); border-radius:10px;
                padding:14px 12px; text-align:center;
            }
            .occ-stat-num { font-size:26px; font-weight:800; line-height:1.2; }
            .occ-stat-label { font-size:12px; color:var(--text-muted,#6b7280); margin-top:4px; font-weight:600; }
            .occ-chart-row { display:flex; gap:24px; flex-wrap:wrap; }
            .occ-chart-col { flex:1; min-width:260px; }
            .occ-chart-title { font-size:13px; font-weight:700; margin-bottom:6px; }
            .occ-money { margin-bottom:22px; }
            .occ-bar-row { margin-bottom:12px; }
            .occ-bar-head { display:flex; justify-content:space-between; font-size:12px; font-weight:600; margin-bottom:4px; }
            .occ-bar-head span:last-child { color:var(--text-muted,#6b7280); }
            .occ-bar { height:10px; border-radius:6px; background:var(--stat-neutral); overflow:hidden; }
            .occ-bar > div { height:100%; border-radius:6px; transition:width .6s ease; }
        </style>
        <div class="occasion-stats">
            <div class="occ-stat-row">${cardsHtml}</div>
            ${budget_progress_html(frm)}
            <div class="occ-chart-row">
                <div class="occ-chart-col">
                    <div class="occ-chart-title">${__("Contributions collected (TZS, cumulative)")}</div>
                    <div class="occ-line" data-series="collected"></div>
                </div>
                <div class="occ-chart-col">
                    <div class="occ-chart-title">${__("Guests invited (cumulative)")}</div>
                    <div class="occ-line" data-series="invited"></div>
                </div>
                <div class="occ-chart-col">
                    <div class="occ-chart-title occ-arrivals-title">${__("Arrivals at the gate (cumulative)")}</div>
                    <div class="occ-line" data-series="arrivals"></div>
                </div>
            </div>
        </div>
    `);

    if (frm.is_new()) return;
    frm.call("get_timeseries").then(r => {
        frm._occ_timeseries = r.message;
        draw_occasion_lines(frm);
    });
}

// Line charts measure their container, so draw them only while the
// statistics tab is visible (a hidden tab has zero width), and again when
// it is opened.
function draw_occasion_lines(frm) {
    const series = frm._occ_timeseries;
    const $wrapper = frm.get_field("statistics_html").$wrapper;
    if (!series || !$wrapper.is(":visible")) return;

    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
        || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
            && document.documentElement.getAttribute("data-theme") !== "light");
    // Categorical slot 1 (blue) — one series per chart, so no legend; the title names it.
    const color = isDark ? "#3987e5" : "#2a78d6";
    const empty = {
        collected: __("No contributions recorded yet."),
        invited: __("No invitations sent yet."),
        arrivals: __("No guests checked in yet."),
    };
    if (series.arrivals_by_time) {
        $wrapper.find(".occ-arrivals-title").text(__("Arrivals at the gate by time (cumulative)"));
    }

    $wrapper.find(".occ-line").each(function () {
        const key = this.dataset.series;
        const points = series[key] || [];
        if (!points.length) {
            $(this).html(`<p class="text-muted small" style="padding:40px 0;text-align:center">${empty[key]}</p>`);
            return;
        }
        $(this).empty();
        new frappe.Chart(this, {
            data: {
                labels: points.map(p => p.x),
                datasets: [{ name: $(this).prev(".occ-chart-title").text(), values: points.map(p => p.y) }],
            },
            type: "line",
            height: 220,
            colors: [color],
            lineOptions: { regionFill: 0, dotSize: 4, hideDots: points.length > 30 ? 1 : 0 },
            axisOptions: { xIsSeries: 1, xAxisMode: "tick", yAxisMode: "span" },
            tooltipOptions: {
                formatTooltipY: v => key === "collected" ? `TZS ${format_number(v, null, 0)}` : format_number(v, null, 0),
            },
        });
    });
}

$(document).on("click", ".form-tabs .nav-link", () => {
    setTimeout(() => {
        if (cur_frm && cur_frm.doctype === "Occasion") draw_occasion_lines(cur_frm);
    }, 60);
});

// Per-row buttons in child table
frappe.ui.form.on("Occasion Guest", {
    generate_card(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        frappe.show_alert({ message: __("Generating card for " + row.guest_name), indicator: "blue" });
        frappe.call({
            method: "e_card_ms.utils.card_composer.compose_single_guest",
            args: { occasion_name: frm.doc.name, guest_row_name: row.name },
            callback(r) {
                if (!r.exc) {
                    frappe.show_alert({ message: __("Card generated!"), indicator: "green" });
                    frm.reload_doc();
                }
            }
        });
    },

    send_whatsapp(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        frappe.confirm(
            __(`Send WhatsApp to ${row.guest_name} (${row.phone})?`),
            function () {
                frappe.call({
                    method: "e_card_ms.api.whatsapp.send_single",
                    args: { occasion_name: frm.doc.name, guest_code: row.guest_code },
                    callback(r) {
                        if (!r.exc) {
                            frappe.show_alert({ message: __("WhatsApp sent!"), indicator: "green" });
                            frm.reload_doc();
                        }
                    }
                });
            }
        );
    },

    send_sms(frm, cdt, cdn) {
        const row = locals[cdt][cdn];
        frappe.confirm(
            __(`Send SMS to ${row.guest_name} (${row.phone})?`),
            function () {
                frappe.call({
                    method: "e_card_ms.api.sms.send_single",
                    args: { occasion_name: frm.doc.name, guest_code: row.guest_code },
                    callback(r) {
                        if (!r.exc) {
                            frappe.show_alert({ message: __("SMS sent!"), indicator: "green" });
                            frm.reload_doc();
                        }
                    }
                });
            }
        );
    }
});

function budget_progress_html(frm) {
    const d = frm.doc;
    const budget = flt(d.total_budget), collected = flt(d.total_collected), pledged = flt(d.total_pledged);
    const spent = flt(d.total_spent);
    if (!budget && !pledged) return "";
    const pct = (part, whole) => (whole > 0 ? Math.min(100, Math.round((part / whole) * 100)) : 0);
    const money = v => "TZS " + format_number(v, null, 0);
    const contributors = d.contributors || [];
    const fully = contributors.filter(c => c.payment_status === "Fully Paid").length;
    const bar = (label, part, whole, color) => `
        <div class="occ-bar-row">
            <div class="occ-bar-head"><span>${label}</span><span>${money(part)} / ${money(whole)} · ${pct(part, whole)}%</span></div>
            <div class="occ-bar"><div style="width:${pct(part, whole)}%;background:var(${color})"></div></div>
        </div>`;
    return `
        <div class="occ-money">
            <div class="occ-chart-title">${__("Budget & Contributions")}</div>
            ${budget ? bar(__("Collected vs budget"), collected, budget, "--stat-aqua") : ""}
            ${pledged ? bar(__("Collected vs pledged"), collected, pledged, "--stat-blue") : ""}
            ${budget ? bar(__("Spent vs budget"), spent, budget, "--stat-orange") : ""}
            <div class="text-muted small">${__("{0} of {1} contributors fully paid", [fully, contributors.length])}</div>
        </div>`;
}
