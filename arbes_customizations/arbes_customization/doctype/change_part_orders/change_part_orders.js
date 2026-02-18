// Copyright (c) 2026, hybrowlabs and contributors
// For license information, please see license.txt

frappe.ui.form.on("Change Part Orders Item", {
    so_number(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code) {
            frappe.model.set_value(cdt, cdn, "item_code", "");
        }
    },
    item_code(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.item_code && !row.so_number) {
            frappe.model.set_value(cdt, cdn, "item_code", "");
            frappe.msgprint(__("Please select SO Number first."));
        }
    }
});

frappe.ui.form.on("Change Part Orders", {
    setup(frm) {
        frm.set_query("item_code", "change_part_orders_item", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            if (!row.so_number) {
                return {
                    filters: { name: ["=", ""] }
                };
            }
            return {
                query: "arbes_customizations.arbes_customization.doctype.change_part_orders.change_part_orders.get_items_from_sales_orders",
                filters: {
                    sales_orders: [row.so_number]
                }
            };
        });
    }
});
