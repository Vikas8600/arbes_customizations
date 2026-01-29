frappe.ui.form.on("Request for Quotation", {
    refresh(frm) {
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__("Send Inquiry"), () => {
                open_rfq_inquiry_dialog(frm);
            }, __("Actions"));
        }
    }
});

function open_rfq_inquiry_dialog(frm) {
    // Fetch suppliers with all contact emails
    frappe.call({
        method: "arbes_customizations.arbes_customization.override.request_for_quotation.get_rfq_suppliers_for_inquiry",
        args: { rfq_names: [frm.doc.name] },
        callback(r) {
            const suppliers = r.message || [];

            if (!suppliers.length) {
                frappe.msgprint(__("No suppliers found in this RFQ"));
                return;
            }

            build_inquiry_dialog(frm.doc.name, suppliers);
        }
    });
}

function build_inquiry_dialog(rfq_name, suppliers) {
    const fields = [
        {
            fieldtype: "HTML",
            fieldname: "supplier_selection",
            options: `<p><strong>Select email addresses to send inquiry:</strong></p>`
        }
    ];

    let email_idx = 0;
    const email_map = {}; // To track email indices

    // Add checkboxes for each supplier's emails
    suppliers.forEach((supplier) => {
        // Supplier header
        fields.push({
            fieldtype: "HTML",
            fieldname: `supplier_header_${supplier.supplier}`,
            options: `<div style="background:#e3f2fd; padding:8px; margin:15px 0 5px 0; border-radius:4px; border-left:3px solid #1976d2;">
                <strong>${supplier.supplier_name}</strong> (${supplier.supplier})
            </div>`
        });

        const emails = supplier.emails || [];
        if (emails.length === 0) {
            fields.push({
                fieldtype: "HTML",
                fieldname: `no_email_${supplier.supplier}`,
                options: `<p style="color:#999; margin-left:10px; font-size:12px;">No email found for this supplier</p>`
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
                    supplier: supplier.supplier,
                    supplier_name: supplier.supplier_name,
                    email: email_data.email
                };
                email_idx++;
            });
        }
    });

    fields.push({ fieldtype: "Section Break" });
    fields.push({
        fieldtype: "Text Editor",
        fieldname: "custom_message",
        label: "Additional Message (Optional)",
        description: "This message will be added to the inquiry email"
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
                method: "arbes_customizations.arbes_customization.override.request_for_quotation.send_rfq_inquiry",
                args: {
                    rfq_name: rfq_name,
                    suppliers: selected,
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
