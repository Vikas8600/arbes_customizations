frappe.ui.form.on("Material Request", {
  refresh(frm) {
    const meterial_req_id = new Set();
    (frm.doc.items || []).forEach((row) => {
      if (row.material_request) {
        meterial_req_id.add(row.material_request);
      }
    });
    if (!frm.doc.custom_material_request_id) {
      const [first_dn] = Array.from(meterial_req_id);
      if (first_dn) {
        frm.set_value("custom_material_request_id", first_dn);
      }
    }
    if (
            frm.doc.docstatus === 1 &&
            frm.doc.material_request_type === "Purchase" &&
            frm.doc.items?.length
        ) {
            frm.add_custom_button(
                __("Send Inquiry"),
                () => open_supplier_inquiry_dialog(frm),
                __("Actions")
            );
        }
  },
});



function open_supplier_inquiry_dialog(frm) {
    let fields = [];

    frm.doc.items
        .filter(item => !item.custom_inquiry_sent)   
        .forEach(item => {
            fields.push({
                fieldtype: "MultiSelectPills",
                fieldname: `suppliers_${item.idx}`,
                label: `${item.item_code} – Suppliers`,
                reqd: 0,
                get_data(txt) {
                    return frappe.call({
                        method: "arbes_customizations.arbes_customization.override.material_request.get_item_suppliers",
                        args: { item_code: item.item_code, search: txt }
                    }).then(r => {
                        return (r.message || []).map(s => ({
                            value: s.supplier,
                            label: `${s.supplier_name} (${s.tag})`
                        }));
                    });
                }
            });
        });

    if (!fields.length) {
        frappe.msgprint("All items already have inquiry sent.");
        return;
    }

    let d = new frappe.ui.Dialog({
        title: "Send Supplier Inquiry",
        size: "large",
        fields,
        primary_action_label: "Send Inquiry",
        primary_action(values) {
            frappe.call({
                method: "arbes_customizations.arbes_customization.override.material_request.send_supplier_inquiry",
                args: {
                    material_request: frm.doc.name,
                    supplier_map: values
                },
                callback() {
                    frappe.msgprint("Inquiry emails sent successfully");
                    d.hide();
                }
            });
        }
    });

    d.show();
}
