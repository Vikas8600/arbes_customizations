const original_settings = frappe.listview_settings['Material Request'] || {};
frappe.listview_settings['Material Request'] = Object.assign({}, original_settings, {
    onload(listview) {
        if (original_settings.onload) {
            original_settings.onload(listview);
        }
        listview.page.add_action_item(__('Send Inquiry'), () => {
            const selected = listview.get_checked_items();

            if (!selected.length) {
                frappe.msgprint(__('Please select at least one Material Request'));
                return;
            }

            const mr_names = selected.map(d => d.name);

            frappe.call({
                method: "arbes_customizations.arbes_customization.override.material_request.validate_mrs_for_inquiry",
                args: { material_requests: mr_names },
                callback(r) {
                    if (!r.message?.valid) {
                        frappe.msgprint(r.message.message);
                        return;
                    }

                    // Use only valid MRs (submitted + Material Issue)
                    const valid_mrs = r.message.valid_mrs || [];
                    const skipped = r.message.skipped || [];

                    // Show info if some MRs were skipped
                    if (skipped.length) {
                        frappe.show_alert({
                            message: `Skipped ${skipped.length} MR(s): ${skipped.join(', ')}`,
                            indicator: 'orange'
                        }, 5);
                    }

                    open_listview_inquiry_dialog(valid_mrs);
                }
            });
        });
    }
});

function open_listview_inquiry_dialog(material_requests) {
    frappe.call({
        method: "arbes_customizations.arbes_customization.override.material_request.get_mr_items_for_inquiry",
        args: { material_requests },
        callback(r) {

            const items = r.message || [];
            if (!items.length) {
                frappe.msgprint("No items found for selected Material Requests");
                return;
            }

            // 🔹 Group items by MR
            const grouped = {};
            items.forEach(row => {
                if (!grouped[row.mr]) grouped[row.mr] = [];
                grouped[row.mr].push(row);
            });

            const fields = [];
            const supplier_controls = {};


            // 🔹 Build accordion-style MR blocks
            Object.keys(grouped).forEach((mr, index) => {
                const rows = grouped[mr];

                fields.push({
                    fieldtype: "HTML",
                    fieldname: `mr_${mr}`,
                    options: `
                        <div class="mr-accordion"
                             data-mr="${mr}"
                             style="
                                border:1px solid #ddd;
                                border-radius:8px;
                                margin-bottom:10px;
                                background:#fafafa;
                             ">

                            <div class="mr-header"
                                 style="
                                    padding:12px;
                                    cursor:pointer;
                                    font-weight:600;
                                    display:flex;
                                    justify-content:space-between;
                                    align-items:center;
                                 ">
                                <span>📄 ${mr}</span>
                                <span style="font-size:12px;color:#666;">
                                    ${rows.length} items
                                </span>
                            </div>

                            <div class="mr-body"
                                 style="
                                    display:none;
                                    padding:10px;
                                    border-top:1px solid #eee;
                                    background:#fff;
                                 ">
                                ${rows.map(row => `
                                    <div style="
                                        border:1px solid #eee;
                                        border-radius:6px;
                                        padding:10px;
                                        margin-bottom:8px;
                                        background:#fcfcfc;
                                    ">
                                        <div style="font-weight:600;">
                                            ${row.item_name}
                                        </div>
                                        <div style="font-size:12px;color:#777;">
                                            ${row.item_code}
                                        </div>
                                        <div id="supplier-field-${row.mr}-${row.idx}"
                                             style="margin-top:6px;">
                                        </div>
                                    </div>
                                `).join("")}
                            </div>
                        </div>
                    `
                });
            });

            const d = new frappe.ui.Dialog({
                title: "Send Supplier Inquiry",
                size: "large",
                fields,
                primary_action_label: "Send Inquiry",
                primary_action() {

                    const supplier_map = {};

                    Object.keys(supplier_controls).forEach(key => {
                        const val = supplier_controls[key].get_value();
                        if (val && val.length) {
                            supplier_map[key] = val;
                        }
                    });

                    if (!Object.keys(supplier_map).length) {
                        frappe.msgprint("Please select at least one supplier.");
                        return;
                    }

                    frappe.call({
                        method: "arbes_customizations.arbes_customization.override.material_request.send_supplier_inquiry_from_list",
                        args: {
                            material_requests,
                            supplier_map
                        },
                        callback() {
                            frappe.msgprint("Inquiry emails sent successfully");
                            d.hide();
                        }
                    });
                }
            });

            d.show();

            // 🔹 Scroll only inside body
            d.$wrapper.find(".modal-body").css({
                maxHeight: "70vh",
                overflowY: "auto"
            });

            // 🔹 Render supplier selectors (only once)
            Object.keys(grouped).forEach(mr => {
                grouped[mr].forEach(row => {

                    const fieldname = `suppliers_${row.mr}_${row.idx}`;

                    const field = frappe.ui.form.make_control({
                        parent: d.$wrapper.find(`#supplier-field-${row.mr}-${row.idx}`),
                        df: {
                            fieldtype: "MultiSelectPills",
                            fieldname,
                            label: "Suppliers",
                            get_data(txt) {
                                return frappe.call({
                                    method: "arbes_customizations.arbes_customization.override.material_request.get_item_suppliers",
                                    args: {
                                        item_code: row.item_code,
                                        search: txt
                                    }
                                }).then(res =>
                                    (res.message || []).map(s => ({
                                        value: s.supplier,
                                        label: `${s.supplier_name} (${s.tag})`
                                    }))
                                );
                            }
                        },
                        render_input: true
                    });

                    field.refresh();
                    supplier_controls[fieldname] = field;
                });
            });

            // 🔹 Accordion behavior: only ONE MR open at a time
            d.$wrapper.on("click", ".mr-header", function () {
                const parent = $(this).closest(".mr-accordion");

                d.$wrapper.find(".mr-body").slideUp(150);
                parent.find(".mr-body").slideToggle(150);
            });

            // 🔹 Sticky footer
            d.$wrapper.find(".modal-footer").css({
                position: "sticky",
                bottom: 0,
                background: "#fff",
                zIndex: 10
            });
        }
    });
}
