frappe.ui.form.on('Item', {
    stock_uom: function(frm){
        if (frm.doc.stock_uom === "MM"){
            frm.set_value("custom_to_uom", "Kg");
            update_conversion_factor_from_weight(frm);
        }

    },
    after_save:function(frm){
        if (flt(frm.doc.custom_specific_gravity) > 0 || flt(frm.doc.custom_total_weight) > 0) {
            update_conversion_factor_from_weight(frm);
        }
    },
    validate: function (frm) {
        if (flt(frm.doc.custom_specific_gravity) > 0 || flt(frm.doc.custom_total_weight) > 0) {
            update_conversion_factor_from_weight(frm);
        }
    },
    custom_section: function (frm) {
        if (!frm.doc.custom_section) return;
    
        const section_input = frm.doc.custom_section.trim().toUpperCase();
        console.log(section_input)
        const default_uom = frm.doc.stock_uom;
        const to_uom = frm.doc.custom_to_uom;
        frm.clear_table("uoms");
        const section_to_specific_gravity = {
            "SS304 ROUND BARS": 7.88,
            "SS316 ROUND BARS": 7.87,
            "SS304 SHEETS" : 8.03,
            "SS316 SHEETS" : 8.03,
            "ALUMINIUM SHEETS":2.71,
            "SS304 CUT PIECES" :8.03,
            "SS304 HOLLOW PIPES (RECTANGLE)": 7.88,
            "SS304 HOLLOW PIPES (SQUARE)": 7.88,
            "SS304 HOLLOW PIPES (ROUND)": 7.88,
            "BRASS SQUARE BAR": 8.5,
            "BRASS ROUND BAR": 8.43,
            "ALUMINIUM ROUND BAR": 2.71,
            "ALUMINIUM SQUARE BAR": 2.71,
            "EN8 ROUND BARS": 7.86,
            "EN9 ROUND BARS": 7.87,
            "EN24 ROUND BARS": 7.85,
            "K110 CUT PIECES" :7.7,
            "STAVAX CUT PIECES": 7.8,
            "RAMMAX CUT PIECES" :7.7,
            "MS PLATES":7.86,
            "Ms CUT PIECES" : 7.86,
            "CUT PIECE": 0.0,
            "RECTANGLE": 0.0,
            "RECTANGLE HOLLOW PIPE": 0.0,
            "ROUND HOLLOW PIPE": 0.0,
            "ROUND": 0.0,
            "SQUARE HOLLOW PIPE": 0.0,
            "HEXAGON": 0.0,
        };
    
    
        let shape = section_to_specific_gravity[section_input];
        console.log(shape)
        if (shape) {   
            console.log(section_to_specific_gravity[section_input])
            frm.set_value("custom_specific_gravity", section_to_specific_gravity[section_input]);
        } else {
            frm.set_value("custom_specific_gravity", "0");
        }

        frm.refresh_field("uoms");
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
    custom_two_side: function(frm, cdt, cdn) {
        calculate_weight(frm, cdt, cdn);
    },
    custom_thickness: function(frm, cdt, cdn) {
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
        case "CUT PIECE":
            let sq_side_one = flt(d.custom_side);
            let sq_side_two = flt(d.custom_two_side)
            console.log(sq_side_one)
            if (sq_side_one && sp_gr && sq_side_two) {
                console.log(sp_gr)
                weight = sq_side_one * sq_side_two * sp_gr * 0.000001;
                console.log(weight)
            }
        break;

    case "RECTANGLE":
        let rect_h = flt(d.custom_height);
        let rect_w = flt(d.custom_width);
        if (rect_h && rect_w && sp_gr) {
            weight = rect_h * rect_w * sp_gr * 0.000001;
        }
        break;

    case "ROUND":
        let round_dia = flt(d.custom_diameter);
        if (round_dia && sp_gr) {
            weight = 0.785398 * round_dia ** 2 * sp_gr * 0.000001;
        }
        break;

    case "ROUND HOLLOW PIPE":
        let round_od = flt(d.custom_outer_diameter);
        let round_id = flt(d.custom_inner_diameter);
        if (round_od && round_id && sp_gr) {
            weight = 0.785398 * (round_od ** 2 - round_id ** 2) * sp_gr * 0.000001;
        }
        break;

    case "SQUARE HOLLOW PIPE":
        let sh_outer = flt(d.custom_outer_side);
        let sh_inner = flt(d.custom_inner_side);
        if (sh_outer && sh_inner && sp_gr) {
            weight = (sh_outer ** 2 - sh_inner ** 2) * sp_gr * 0.000001;
        }
        break;

    case "RECTANGLE HOLLOW PIPE":
        let rh_oh = flt(d.custom_outer_height);
        let rh_ow = flt(d.custom_outer_width);
        let rh_ih = flt(d.custom_inner_height);
        let rh_iw = flt(d.custom_inner_width);
        if (rh_oh && rh_ow && rh_ih && rh_iw && sp_gr) {
            weight = (rh_oh * rh_ow - rh_ih * rh_iw) * sp_gr * 0.000001;
        }
        break;

    case "HEXAGON":
        let across_flat = flt(d.custom_across_flat);
        if (across_flat && sp_gr) {
            weight = 0.866025 * across_flat ** 2 * sp_gr * 0.000001;
        }
        break;
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
                console.log(weight)
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
            
            if (oh && ow && ih && iw && sp_gr) {
                weight = ((oh * ow) - (ih * iw)) * sp_gr * 0.000001;
            }
            break;

        case "SS304 SHEETS":
        case "SS316 SHEETS":
        case "MS PLATES":
            let side1 = flt(d.custom_side);
            let side2 = flt(d.custom_two_side);
            let thk = flt(d.custom_thickness);
            console.log(thk)
            if (side1 && side2 && thk && sp_gr) {
                weight = side1 * side2 * thk * sp_gr * 0.000001;
            }
            break;
        
        case "ALUMINIUM SHEETS":
            let side_one = flt(d.custom_side);
            let side_two = flt(d.custom_two_side);
            let thickness = flt(d.custom_thickness);
            if (side_one && side_two && thickness && sp_gr) {
                weight = side1 * side2 * thickness * sp_gr * 0.000001;
            }
            break;
            
        case "K110 Cut pieces":
        case "Stavax Cut Pieces":
        case "Rammax Cut Pieces":
            let side_x = flt(d.custom_side);
            let side_y = flt(d.custom_two_side);
            let thickness_z = flt(d.custom_thickness);
            if (side_x && side_y && thickness_z && sp_gr) {
                weight = side_x * side_y * thickness_z * sp_gr * 0.000001;
            }
            break;

        case "SS304 Cut Pieces":
            let side_a = flt(d.custom_side);
            let side_b= flt(d.custom_two_side);
            let thickness_c = flt(d.custom_thickness);
            if (side_a && side_b && thickness_c && sp_gr) {
                weight = side_a * side_b * thickness_c * sp_gr * 0.000001;
            }
            break;

    }

    frappe.model.set_value(cdt, cdn, "custom_total_weight", flt(weight) || 0);

    update_conversion_factor_from_weight(frm);    
}

function update_conversion_factor_from_weight(frm) {
    const default_uom = frm.doc.stock_uom;
    const to_uom = frm.doc.custom_to_uom;
    const weight = flt(frm.doc.weight_per_unit || frm.doc.custom_total_weight);
    if (!default_uom || !to_uom || !weight || weight<=0) return;

    let factor = 1;

    if (default_uom === "Kg" && to_uom === "MM") {
        factor = weight;
    } else if (default_uom === "MM" && to_uom === "Kg") {
      
        factor = weight ? (1 / weight) : 0;
        console.log(factor)
    } else {
        return;
    }

    // Set default UOM factor = 1
    let default_row = frm.doc.uoms?.find(row => row.uom.toUpperCase() === default_uom.toUpperCase());
    if (default_row) {
        frappe.model.set_value(default_row.doctype, default_row.name, "conversion_factor", 1);
    } else {
        frm.add_child("uoms", {
            uom: default_uom,
            conversion_factor: 1
        });
    }

    // Set conversion factor for target UOM
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

