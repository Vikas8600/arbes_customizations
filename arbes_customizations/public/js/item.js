frappe.ui.form.on('Item', {
    custom_section: function (frm) {
        if (!frm.doc.custom_section) return;
    
        const section_input = frm.doc.custom_section.trim().toUpperCase();
        const default_uom = frm.doc.stock_uom;
        const to_uom = frm.doc.custom_to_uom;
    
        const section_to_shape = {
            "SS304 ROUND BARS": "ROUND",
            "SS316 ROUND BARS": "ROUND",
            "EN8 ROUND BARS": "ROUND",
            "EN9 ROUND BARS": "ROUND",
            "EN24 ROUND BARS": "ROUND",
            "BRASS ROUND BAR": "ROUND",
            "ALUMINIUM ROUND BAR": "ROUND",
    
            "BRASS SQUARE BAR": "SQUARE",
            "ALUMINIUM SQUARE BAR": "SQUARE",
            "SS304 HOLLOW PIPES (RECTANGLE)": "RECTANGLE HOLLOW PIPE",
            "SS304 HOLLOW PIPES (SQUARE)": "SQUARE HOLLOW PIPE",
            "SS304 HOLLOW PIPES (ROUND)": "ROUND HOLLOW PIPE"
        };
    
        const section_to_specific_gravity = {
            "SS304 ROUND BARS": 7.88,
            "SS316 ROUND BARS": 7.87,
            "SS304 HOLLOW PIPES (RECTANGLE)": 7.88,
            "SS304 HOLLOW PIPES (SQUARE)": 7.88,
            "SS304 HOLLOW PIPES (ROUND)": 7.88,
            "BRASS SQUARE BAR": 8.5,
            "BRASS ROUND BAR": 8.43,
            "ALUMINIUM ROUND BAR": 2.71,
            "ALUMINIUM SQUARE BAR": 2.71,
            "EN8 ROUND BARS": 7.86,
            "EN9 ROUND BARS": 7.87,
            "EN24 ROUND BARS": 7.85
        };
    
        const section_to_factor = {
            "SQUARE": 0.012688,
            "RECTANGLE": 0.003965,
            "RECTANGLE HOLLOW PIPE": 0.003044,
            "ROUND HOLLOW PIPE": 0.00276,
            "ROUND": 0.00996,
            "SQUARE HOLLOW PIPE": 0.00352,
            "HEXAGON": 0.00824
        };
    
        let shape = section_to_shape[section_input];
    
        if (!shape && section_to_factor[section_input]) {
            shape = section_input;
        }
   
        if (section_to_specific_gravity[section_input]) {
            frm.set_value("custom_specific_gravity", section_to_specific_gravity[section_input]);
        } else {
            frm.set_value("custom_specific_gravity", null);
        }
    
        if (
            shape &&
            section_to_factor[shape] &&
            ((default_uom === "Kg" && to_uom === "MM") || (default_uom === "MM" && to_uom === "Kg"))
        ) {
            const factor = section_to_factor[shape];
        
            let default_row = frm.doc.uoms?.find(row => row.uom.toUpperCase() === default_uom.toUpperCase());
            if (default_row) {
                frappe.model.set_value(default_row.doctype, default_row.name, "conversion_factor", 1);
            } else {
                frm.add_child("uoms", {
                    uom: default_uom,
                    conversion_factor: 1
                });
            }
        
            let to_row = frm.doc.uoms?.find(row => row.uom.toUpperCase() === to_uom.toUpperCase());
            if (to_row) {
                frappe.model.set_value(to_row.doctype, to_row.name, "conversion_factor", factor);
            } else {
                frm.add_child("uoms", {
                    uom: to_uom,
                    conversion_factor: factor
                });
            }
        
            frm.refresh_field("uoms");
        }
        
    },
    
    custom_custom_section: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_specific_gravity: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_side: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_height: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_width: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_diameter: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_outer_diameter: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_inner_diameter: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_outer_side: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_inner_side: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_outer_height: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_outer_width: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_inner_height: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_inner_width: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_across_flat: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    weight_per_unit: function(frm, cdt, cdn) {
        calculate_total_weight(frm, cdt, cdn);
    },
    qty: function(frm, cdt, cdn) {
        calculate_total_weight(frm, cdt, cdn);
    },
});

function calculate_total_weight(frm, cdt, cdn) {
    let d = locals[cdt][cdn];
    let weight_per_unit = flt(d.weight_per_unit);
    let qty = flt(d.qty);
    if (weight_per_unit && qty) {
        custom_total_weight = weight_per_unit * qty;
        frappe.model.set_value(cdt, cdn, "total_weight", custom_total_weight);
    }
}

function calculate_weight(frm, cdt, cdn) {
    let d = locals[cdt][cdn];
    let section = d.custom_section;
    let sp_gr = flt(d.custom_specific_gravity);
    let weight = 0;

    switch (section) {
        
          
    
    case "BRASS SQUARE BAR":
        case "ALUMINIUM SQUARE BAR":
            let side_square = flt(d.custom_side);
            if (side_square && sp_gr) {
                weight = side_square ** 2 * sp_gr * 0.000001;
            }
            break;
        case "SS304 ROUND BARS":
        case "SS316 ROUND BARS":
        case "EN8 ROUND BARS":
        case "EN9 ROUND BARS":
        case "EN24 ROUND BARS":
        case "BRASS ROUND BAR":
        case "ALUMINIUM ROUND BAR":
        case "SS304 ROUND BARS":
            let dia = flt(d.custom_diameter);
            console.log(sp_gr)
            if (dia && sp_gr) {
                weight = 0.785398 * dia ** 2 * sp_gr * 0.000001;
            }
            break;

        
        case "SS304 HOLLOW PIPES (ROUND)":
            let od = flt(d.custom_outer_diameter);
            let id = flt(d.custom_inner_diameter);
            if (od && id && sp_gr) {
                weight = 0.785398 * (od ** 2 - id ** 2) * sp_gr * 0.000001;
            }
            break;

        case "SS304 HOLLOW PIPES (SQUARE)":
            let os = flt(d.custom_outer_side);
            let is_ = flt(d.custom_inner_side);
            if (os && is_ && sp_gr) {
                weight = (os ** 2 - is_ ** 2) * sp_gr * 0.000001;
            }
            break;

        case "SS304 HOLLOW PIPES (RECTANGLE)":
           
            let oh = flt(d.custom_outer_height);
            let ow = flt(d.custom_outer_width);
            let ih = flt(d.custom_inner_height);
            let iw = flt(d.custom_inner_width);
            console.log(oh)
            console.log(ow)
            console.log(ih)
            console.log(iw)
            if (oh && ow && ih && iw && sp_gr) {
                weight = ((oh * ow) - (ih * iw)) * sp_gr * 0.000001;
            }
            break;

    }

    frappe.model.set_value(cdt, cdn, "custom_total_weight", flt(weight) || 0);
}