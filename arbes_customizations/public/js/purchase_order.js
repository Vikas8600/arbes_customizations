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
