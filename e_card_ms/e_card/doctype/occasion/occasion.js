frappe.ui.form.on("Occasion", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.call("get_invited_count").then(r => {
                render_occasion_statistics(frm, r.message || 0);
            });
        }
    },

    open_gate_checkin_btn(frm) {
        if (frm.is_new()) {
            frappe.msgprint(__("Save the Occasion first."));
            return;
        }
        window.open(`/gate-checkin?occasion=${encodeURIComponent(frm.doc.name)}`, "_blank");
    },

    generate_cards_btn(frm) {
        frappe.confirm(
            __("Generate/regenerate QR code cards for all guests?"),
            function () {
                frappe.show_alert({ message: __("Generating cards..."), indicator: "blue" });
                frm.call("generate_all_cards").then(r => {
                    const res = r.message;
                    frappe.show_alert({
                        message: __(`Done: ${res.success} success, ${res.failed} failed`),
                        indicator: res.failed > 0 ? "orange" : "green"
                    });
                    if (res.errors.length) {
                        frappe.msgprint({
                            title: __("Errors"),
                            message: res.errors.join("<br>"),
                            indicator: "red"
                        });
                    }
                    frm.reload_doc();
                });
            }
        );
    },

    send_whatsapp_btn(frm) {
        frappe.confirm(
            __("Send WhatsApp invitations to all unsent guests?"),
            function () {
                frappe.show_alert({ message: __("Sending..."), indicator: "blue" });
                frm.call("send_all_whatsapp").then(r => {
                    const res = r.message;
                    frappe.show_alert({
                        message: __(`Sent: ${res.success}, Failed: ${res.failed}`),
                        indicator: res.failed > 0 ? "orange" : "green"
                    });
                    if (res.errors.length) {
                        frappe.msgprint({
                            title: __("WhatsApp Errors"),
                            message: res.errors.join("<br>"),
                            indicator: "red"
                        });
                    }
                });
            }
        );
    },

    send_sms_btn(frm) {
        frappe.confirm(
            __("Send SMS invitations to all unsent guests?"),
            function () {
                frappe.show_alert({ message: __("Sending..."), indicator: "blue" });
                frm.call("send_all_sms").then(r => {
                    const res = r.message;
                    frappe.show_alert({
                        message: __(`Sent: ${res.success}, Failed: ${res.failed}`),
                        indicator: res.failed > 0 ? "orange" : "green"
                    });
                    if (res.errors.length) {
                        frappe.msgprint({
                            title: __("SMS Errors"),
                            message: res.errors.join("<br>"),
                            indicator: "red"
                        });
                    }
                });
            }
        );
    }
});

function render_occasion_statistics(frm, invitedCount) {
    const $wrapper = frm.get_field("statistics_html").$wrapper;
    const guests = frm.doc.guests || [];

    const total     = guests.length;
    const confirmed = guests.filter(g => g.rsvp_status === "Confirmed").length;
    const pending    = guests.filter(g => g.rsvp_status === "Pending").length;
    const declined   = guests.filter(g => g.rsvp_status === "Declined").length;
    const sent       = invitedCount || 0;
    const checkedIn  = guests.filter(g => g.checked_in).length;
    const notCheckedIn = total - checkedIn;

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
            .occ-chart-col { flex:1; min-width:280px; }
            .occ-chart-title { font-size:13px; font-weight:700; margin-bottom:6px; }
        </style>
        <div class="occasion-stats">
            <div class="occ-stat-row">${cardsHtml}</div>
            <div class="occ-chart-row">
                <div class="occ-chart-col">
                    <div class="occ-chart-title">${__("RSVP Status")}</div>
                    <div id="occasion-rsvp-chart"></div>
                </div>
                <div class="occ-chart-col">
                    <div class="occ-chart-title">${__("Gate Check-in")}</div>
                    <div id="occasion-checkin-chart"></div>
                </div>
            </div>
        </div>
    `);

    if (total === 0) {
        $wrapper.find(".occasion-stats").append(
            `<p class="text-muted small" style="margin-top:12px;">${__("Add guests to see statistics.")}</p>`
        );
        return;
    }

    const isDark = document.documentElement.getAttribute("data-theme") === "dark"
        || (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
            && document.documentElement.getAttribute("data-theme") !== "light");

    // Status triad (good/warning/critical) — fixed, never themed, same hex both modes.
    new frappe.Chart("#occasion-rsvp-chart", {
        data: {
            labels: [__("Confirmed"), __("Pending"), __("Declined")],
            datasets: [{ values: [confirmed, pending, declined] }]
        },
        type: "pie",
        height: 220,
        colors: ["#0ca30c", "#fab219", "#d03b3b"]
    });

    // Highlight (categorical blue) vs. neutral (chrome gray) — binary state.
    new frappe.Chart("#occasion-checkin-chart", {
        data: {
            labels: [__("Checked In"), __("Not Yet")],
            datasets: [{ values: [checkedIn, notCheckedIn] }]
        },
        type: "pie",
        height: 220,
        colors: isDark ? ["#3987e5", "#383835"] : ["#2a78d6", "#c3c2b7"]
    });
}

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
