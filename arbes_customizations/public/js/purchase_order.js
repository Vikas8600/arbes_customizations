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
    }
});

function calculate_weight(frm, cdt, cdn) {
    let d = locals[cdt][cdn];
    let section = d.custom_section;
    let sp_gr = flt(d.custom_specific_gravity);
    let weight = 0;

    switch (section) {
        case "SQUARE":
            let side = flt(d.custom_side);
            if (side && sp_gr) {
                weight = side ** 2 * sp_gr * 0.000001;
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
            let dia = flt(d.custom_diameter);
            if (dia && sp_gr) {
                weight = 0.785398 * dia ** 2 * sp_gr * 0.000001;
            }
            break;

        case "ROUND HOLLOW PIPE":
            let od = flt(d.custom_outer_diameter);
            let id = flt(d.custom_inner_diameter);
            if (od && id && sp_gr) {
                weight = 0.785398 * (od ** 2 - id ** 2) * sp_gr * 0.000001;
            }
            break;

        case "SQUARE HOLLOW PIPE":
            let os = flt(d.custom_outer_side);
            let is_ = flt(d.custom_inner_side);
            if (os && is_ && sp_gr) {
                weight = (os ** 2 - is_ ** 2) * sp_gr * 0.000001;
            }
            break;

        case "RECTANGLE HOLLOW PIPE":
            let oh = flt(d.custom_outer_height);
            let ow = flt(d.custom_outer_width);
            let ih = flt(d.custom_inner_height);
            let iw = flt(d.custom_inner_width);
            if (oh && ow && ih && iw && sp_gr) {
                weight = ((oh * ow) - (ih * iw)) * sp_gr * 0.000001;
            }
            break;

        case "HEXAGON":
            let af = flt(d.custom_across_flat);
            if (af && sp_gr) {
                weight = 0.866025 * af ** 2 * sp_gr * 0.000001;
            }
            break;
    }

    frappe.model.set_value(cdt, cdn, "weight_per_unit", flt(weight) || 0);
}