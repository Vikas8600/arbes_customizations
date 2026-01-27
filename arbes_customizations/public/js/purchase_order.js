frappe.ui.form.on('Purchase Order', {
    validate: function(frm) {
        if(frm.doc.payment_schedule){
            let total = frm.doc.total;
            frm.doc.payment_schedule.forEach(function(row){
                row.custom_amount_without_gst = total * (row.invoice_portion / 100);
            });
            frm.refresh_field('payment_schedule');
        }
    },
    refresh(frm) {
        const existing_so_ids = new Set(
            (frm.doc.custom_sales_order_number || []).map(row => row.sales_order)
        );    
        const so_ids_from_items = new Set();    
        (frm.doc.items || []).forEach(row => {
            if (row.custom_so_number && !existing_so_ids.has(row.custom_so_number)) {
                so_ids_from_items.add(row.custom_so_number);
            }
        });    
        // Add only missing SO IDs
        Array.from(so_ids_from_items).forEach(so_id => {
            const row = frm.add_child('custom_sales_order_number');
            row.sales_order = so_id;
        });    
        frm.refresh_field('custom_sales_order_number');
    }    
});

frappe.ui.form.on('Purchase Order Item', {

    item_code(frm, cdt, cdn) {
        calculate_qty_from_default_uom(frm, cdt, cdn);
    },

    custom_default_uom_qty(frm, cdt, cdn) {
        calculate_qty_from_default_uom(frm, cdt, cdn);
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
        case "CUT PIECE":
            let sq_side_one = flt(d.custom_side);
            let sq_side_two = flt(d.custom_two_side)
            if (sq_side_one && sp_gr && sq_side_two) {
                weight = sq_side_one * sq_side_two * sp_gr * 0.000001;
            }
        break;

        case "RECTANGLE":
            let height = flt(d.custom_height);
            let width = flt(d.custom_width);
            if (height && width && sp_gr) {
                weight = height * width * sp_gr * 0.000001;
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
            if (round_od && id && sp_gr) {
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
            let af = flt(d.custom_across_flat);
            if (af && sp_gr) {
                weight = 0.866025 * af ** 2 * sp_gr * 0.000001;
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
            let side2 = flt(d.custom_side_two);
            let thk = flt(d.custom_thickness);
            console.log(thk)
            if (side1 && side2 && thk && sp_gr) {
                weight = side1 * side2 * thk * sp_gr * 0.000001;
            }
            break;
        
        case "ALUMINIUM SHEETS":
            let side_one = flt(d.custom_side);
            let side_two = flt(d.custom_side_two);
            let thickness = flt(d.custom_thickness);
            if (side_one && side_two && thickness && sp_gr) {
                weight = side_one * side_two * thickness * sp_gr * 0.000001;
            }
            break;
            
        case "K110 CUT PIECES":
        case "STAVAX CUT PIECES":
        case "RAMMAX CUT PIECES":
            let side_x = flt(d.custom_side);
            let side_y = flt(d.custom_side_two);
            let thickness_z = flt(d.custom_thickness);
            if (side_x && side_y && thickness_z && sp_gr) {
                weight = side_x * side_y * thickness_z * sp_gr * 0.000001;
            }
            break;

        case "SS304 CUT PIECES":
            let side_a = flt(d.custom_side);
            let side_b= flt(d.custom_side_two);
            let thickness_c = flt(d.custom_thickness);
            if (side_a && side_b && thickness_c && sp_gr) {
                weight = side_a * side_b * thickness_c * sp_gr * 0.000001;
            }
            break;

        case "MS CUT PIECES":
            let side_l = flt(d.custom_side);
            let side_m = flt(d.custom_side_two);
            let thickness_n = flt(d.custom_thickness);
            if (side_l && side_m && thickness_n && sp_gr) {
                weight = side_l * side_m * thickness_n * sp_gr * 0.000001;
            }
            break;

    }
    frappe.model.set_value(cdt, cdn, "weight_per_unit", flt(weight) || 0);
}

function calculate_qty_from_default_uom(frm, cdt, cdn) {
    let row = locals[cdt][cdn];

    if (!row.custom_default_uom_qty || !row.custom_calculated_weight_kg) {
        row.qty = 0;
        frm.refresh_field('items');
        return;
    }

    let qty_in_kg = flt(row.custom_default_uom_qty) * flt(row.custom_calculated_weight_kg);

    row.qty = qty_in_kg;

    frm.refresh_field('items');
}
