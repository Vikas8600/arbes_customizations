frappe.ui.form.on('Sales Order', {
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
    }
});
