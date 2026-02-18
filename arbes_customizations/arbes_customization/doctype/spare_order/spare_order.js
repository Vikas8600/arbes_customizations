// Copyright (c) 2026, hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Spare Order Item", {
    so_no(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.model.set_value(cdt, cdn, "item_code", "");
        }
    },
    item_code(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code && !row.so_no) {
            frappe.model.set_value(cdt, cdn, "item_code", "");
            frappe.msgprint(__("Please select SO No. first."));
        }
    }
});

frappe.ui.form.on("Spare Order", {
    setup(frm) {
        frm.set_query("item_code", "spare_order_item", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            if (!row.so_no) {
                return {
                    filters: { name: ["=", ""] }
                };
            }
            return {
                query: "arbes_customizations.arbes_customization.doctype.spare_order.spare_order.get_items_from_sales_orders",
                filters: {
                    sales_orders: [row.so_no]
                }
            };
        });
    }
});
