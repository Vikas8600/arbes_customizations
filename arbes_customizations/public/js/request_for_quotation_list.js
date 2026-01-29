const original_rfq_settings = frappe.listview_settings['Request for Quotation'] || {};
frappe.listview_settings['Request for Quotation'] = Object.assign({}, original_rfq_settings, {
    onload(listview) {
        if (original_rfq_settings.onload) {
            original_rfq_settings.onload(listview);
        }

        listview.page.add_action_item(__('Send Inquiry'), () => {
            const selected = listview.get_checked_items();

            if (!selected.length) {
                frappe.msgprint(__('Please select at least one RFQ'));
                return;
            }

            // Only submitted RFQs
            const valid_rfqs = selected.filter(d => d.docstatus === 1);

            if (!valid_rfqs.length) {
                frappe.msgprint(__('Please select submitted RFQs only'));
                return;
            }

            const rfq_names = valid_rfqs.map(d => d.name);

            frappe.call({
                method: "arbes_customizations.arbes_customization.override.request_for_quotation.get_rfq_suppliers_for_inquiry",
                args: { rfq_names },
                callback(r) {
                    if (!r.message || !r.message.length) {
                        frappe.msgprint(__("No suppliers found in selected RFQs"));
                        return;
                    }

                    open_rfq_list_inquiry_dialog(rfq_names, r.message);
                }
            });
        });
    }
});

function open_rfq_list_inquiry_dialog(rfq_names, suppliers) {
    const fields = [
        {
            fieldtype: "HTML",
            fieldname: "info",
            options: `<p><strong>RFQs:</strong> ${rfq_names.join(", ")}</p>
                      <p><strong>Select email addresses to send inquiry:</strong></p>`
        }
    ];

    // Group suppliers by RFQ
    const grouped = {};
    suppliers.forEach(s => {
        if (!grouped[s.rfq]) grouped[s.rfq] = [];
        grouped[s.rfq].push(s);
    });

    let email_idx = 0;
    const email_map = {};

    Object.keys(grouped).forEach(rfq => {
        // RFQ Header
        fields.push({
            fieldtype: "HTML",
            fieldname: `rfq_header_${rfq}`,
            options: `<div style="background:#f5f5f5; padding:10px; margin:15px 0 5px 0; border-radius:4px; font-weight:bold;">${rfq}</div>`
        });

        grouped[rfq].forEach(supplier => {
            // Supplier header
            fields.push({
                fieldtype: "HTML",
                fieldname: `supplier_header_${rfq}_${supplier.supplier}`,
                options: `<div style="background:#e3f2fd; padding:8px; margin:10px 0 5px 15px; border-radius:4px; border-left:3px solid #1976d2;">
                    <strong>${supplier.supplier_name}</strong> (${supplier.supplier})
                </div>`
            });

            const emails = supplier.emails || [];
            if (emails.length === 0) {
                fields.push({
                    fieldtype: "HTML",
                    fieldname: `no_email_${rfq}_${supplier.supplier}`,
                    options: `<p style="color:#999; margin-left:25px; font-size:12px;">No email found for this supplier</p>`
                });
            } else {
                emails.forEach((email_data) => {
                    const primary_badge = email_data.is_primary ? '<span style="background:#4caf50; color:white; padding:2px 6px; border-radius:3px; font-size:10px; margin-left:5px;">Primary</span>' : '';
                    const contact_info = email_data.contact ? ` (${email_data.contact})` : '';

                    fields.push({
                        fieldtype: "Check",
                        fieldname: `email_${email_idx}`,
                        label: `${email_data.email}${contact_info}${primary_badge}`,
                        default: email_data.is_primary ? 1 : 0
                    });

                    email_map[email_idx] = {
                        rfq: rfq,
                        supplier: supplier.supplier,
                        supplier_name: supplier.supplier_name,
                        email: email_data.email
                    };
                    email_idx++;
                });
            }
        });
    });

    fields.push({ fieldtype: "Section Break" });
    fields.push({
        fieldtype: "Text Editor",
        fieldname: "custom_message",
        label: "Additional Message (Optional)"
    });

    const d = new frappe.ui.Dialog({
        title: __("Send Inquiry to Suppliers"),
        fields: fields,
        size: "large",
        primary_action_label: __("Send Inquiry"),
        primary_action(values) {
            const selected = [];

            Object.keys(email_map).forEach(idx => {
                if (values[`email_${idx}`]) {
                    selected.push(email_map[idx]);
                }
            });

            if (!selected.length) {
                frappe.msgprint(__("Please select at least one email address"));
                return;
            }

            frappe.call({
                method: "arbes_customizations.arbes_customization.override.request_for_quotation.send_rfq_inquiry_bulk",
                args: {
                    suppliers_data: selected,
                    custom_message: values.custom_message || ""
                },
                freeze: true,
                freeze_message: __("Sending Inquiry..."),
                callback(r) {
                    if (r.message && r.message.success) {
                        frappe.msgprint(__("Inquiry sent successfully to {0} email(s)", [r.message.count]));
                        d.hide();
                    }
                }
            });
        }
    });

    d.show();

    // Style the dialog
    d.$wrapper.find(".modal-body").css({
        maxHeight: "70vh",
        overflowY: "auto"
    });
}
