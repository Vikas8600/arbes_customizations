frappe.ui.form.on('Sales Invoice', {
    validate: function(frm) {
        if(frm.doc.payment_schedule){
            let total = frm.doc.total;
            frm.doc.payment_schedule.forEach(function(row){
                row.custom_amount_without_gst = total * (row.invoice_portion / 100);
            });
            frm.refresh_field('payment_schedule');
        }
        if (frm.doc.custom_domestic_export === 'Export' && frm.doc.gst_category !== 'Overseas') {
            frappe.throw(__('GST Category must be "Overseas" when Domestic Export is "Export".'));
        }
    },
    after_save: function(frm) {
        if(frm.doc.payment_schedule){
            let total = frm.doc.total;
            frm.doc.payment_schedule.forEach(function(row){
                row.custom_amount_without_gst = total * (row.invoice_portion / 100);
            });
            frm.refresh_field('payment_schedule');
        }
    },
    customer_address: function(frm) {
        if(frm.doc.customer_address) {
            frappe.db.get_value('Address', frm.doc.customer_address, 'country', function(r) {
                if(r.country === 'India') {
                    frm.set_value('custom_domestic_export', 'Domestic');
                }else {
                    frm.set_value('custom_domestic_export', 'Export');
                }
            });
        }else {
            frm.set_value('custom_domestic_export', '');
        }
    },
    refresh(frm) {
        const delivery_note_ids = new Set();
    
        (frm.doc.items || []).forEach(row => {
            if (row.delivery_note) {
                delivery_note_ids.add(row.delivery_note);
            }
        });    
        if (!frm.doc.custom_types_of_packing_ || !frm.doc.custom_no_of_boxes) {
                const [first_dn] = Array.from(delivery_note_ids);
            if (first_dn) {
                frappe.db.get_value('Delivery Note', first_dn, ['custom_packing_type', 'custom_no_of_box'])
                    .then(r => {
                        const data = r.message;
                        if (data) {
                            // Set values only if not already set
                            if (!frm.doc.custom_types_of_packing_ && data.custom_packing_type) {
                                frm.set_value('custom_types_of_packing_', data.custom_packing_type);
                            }
                            if (!frm.doc.custom_no_of_boxes && data.custom_no_of_box) {
                                frm.set_value('custom_no_of_boxes', data.custom_no_of_box);
                            }
                        }
                    });
            }
        }
    }
     
});
