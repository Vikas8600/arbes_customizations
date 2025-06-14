frappe.ui.form.on('Item', {
    custom_section: function(frm) {
       
        if (!frm.doc.custom_section) return; 

        let section  = frm.doc.custom_section.toUpperCase();
        console.log(section)
        let default_uom = frm.doc.stock_uom;
        
        const section_to_factor = {
            "SQUARE": 0.012688,
            "RECTANGLE": 0.003965,
            "RECTANGLE HOLLOW PIPE": 0.003044,
            "ROUND HOLLOW PIPE": 0.00276,
            "ROUND": 0.00996,
            "SQUARE HOLLOW PIPE": 0.00352,
            "HEXAGON": 0.00824
        };

        if (default_uom === "Kg" && section_to_factor[section]){
            let uom_row = frm.doc.uoms.find(row => row.uom.toUpperCase() === "MM");

            if (uom_row){
                frappe.model.set_value(uom_row.doctype, uom_row.name, "conversion_factor", section_to_factor[section]);
            }else{
                frm.add_child("uoms",{
                    uom: "MM",
                    conversion_factor: section_to_factor[section]
                });
                frm.refresh_field("uoms")

            }
        }
    }
});
