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
  },
});

