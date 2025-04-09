frappe.ui.form.on('Production Plan', {
    refresh(frm) {
        console.log("Production Plan form refreshed");
        if (frm.doc.docstatus === 1) {
            frappe.call({
                method: "frappe.client.get_list",
                args: {
                    doctype: "Work Order",
                    filters: {
                        production_plan: frm.doc.name
                    },
                    limit: 1
                },
                callback: function(res) {
                    if (res.message && res.message.length > 0) {
                        // At least one Work Order exists, hide the button
                        frm.remove_custom_button("Work Order / Subcontract PO", "Create");
                    }
                }
            });
        }
    }
});
