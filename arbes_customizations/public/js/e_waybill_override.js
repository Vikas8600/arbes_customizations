console.log("✅ Custom e-waybill override loaded");

// Override the dialog function globally
function get_generate_e_waybill_dialog(opts, frm) {
    if (!frm) frm = { doc: {} };
    const ewaybill_defaults = get_sub_suppy_type_options(frm);

    const fields = [
        {
            label: "Document Details",
            fieldname: "section_doc_details",
            fieldtype: "Section Break",
        },
        {
            label: "Supply Type",
            fieldname: "supply_type",
            fieldtype: "Data",
            read_only: 1,
            default: ewaybill_defaults.supply_type,
        },
        {
            label: "Document Type",
            fieldname: "document_type",
            fieldtype: "Data",
            read_only: 1,
            default: ewaybill_defaults.document_type,
        },
        {
            fieldtype: "Column Break",
        },
        {
            label: "Sub Supply Type",
            fieldname: "sub_supply_type",
            fieldtype: "Select",
            options: ewaybill_defaults.sub_supply_type.join("\n"),
            default: ewaybill_defaults.sub_supply_type[0],
            read_only: ewaybill_defaults.sub_supply_type.length === 1,
            reqd: ewaybill_defaults.sub_supply_type.length !== 1,
        },
        {
            label: "Sub Supply Description",
            fieldname: "sub_supply_desc",
            fieldtype: "Data",
            depends_on: "eval: doc.sub_supply_type == 'Others'",
            mandatory_depends_on: "eval: doc.sub_supply_type == 'Others'",
            default: ewaybill_defaults.sub_supply_desc,
        },
        {
            label: "Part A",
            fieldname: "section_part_a",
            fieldtype: "Section Break",
        },
        {
            label: "Transporter",
            fieldname: "transporter",
            fieldtype: "Link",
            options: "Supplier",
            default: frm.doc.transporter,
            get_query: () => ({
                filters: { is_transporter: 1 },
            }),
            onchange: () => update_gst_tranporter_id(d),
        },
        {
            label: "Distance (in km)",
            fieldname: "distance",
            fieldtype: "Float",
            default: frm.doc.distance || 0,
            description: "Set as zero to update distance as per the e-Waybill portal (if available)",
        },
        {
            fieldtype: "Column Break",
        },
        {
            label: "GST Transporter ID",
            fieldname: "gst_transporter_id",
            fieldtype: "Data",
            default: frm.doc.gst_transporter_id?.length == 15 ? frm.doc.gst_transporter_id : "",
            onchange: () => validate_gst_transporter_id(d),
        },
        // ✅ Custom field here
        {
            label: "Exhibition Fare",
            fieldname: "exhibition_fare",
            fieldtype: "Currency",
        },
        {
            label: "Part B",
            fieldname: "section_part_b",
            fieldtype: "Section Break",
        },
        {
            label: "Vehicle No",
            fieldname: "vehicle_no",
            fieldtype: "Data",
            default: frm.doc.vehicle_no,
            onchange: () => update_generation_dialog(d, frm.doc),
        },
        {
            label: "Transport Receipt No",
            fieldname: "lr_no",
            fieldtype: "Data",
            default: frm.doc.lr_no,
            onchange: () => update_generation_dialog(d, frm.doc),
        },
        {
            label: "Transport Receipt Date",
            fieldname: "lr_date",
            fieldtype: "Date",
            default: frm.doc.lr_date || "Today",
            mandatory_depends_on: "eval:doc.lr_no",
        },
        {
            fieldtype: "Column Break",
        },
        {
            label: "Mode Of Transport",
            fieldname: "mode_of_transport",
            fieldtype: "Select",
            options: `\nRoad\nAir\nRail\nShip`,
            default: frm.doc.mode_of_transport || "Road",
            onchange: () => {
                update_generation_dialog(d, frm.doc);
                update_vehicle_type(d);
            },
        },
        {
            label: "GST Vehicle Type",
            fieldname: "gst_vehicle_type",
            fieldtype: "Select",
            options: `Regular\nOver Dimensional Cargo (ODC)`,
            depends_on: 'eval:["Road", "Ship"].includes(doc.mode_of_transport)',
            read_only_depends_on: "eval: doc.mode_of_transport == 'Ship'",
            default: frm.doc.gst_vehicle_type || "Regular",
        },
    ];

    const is_foreign_transaction = frm.doc.gst_category === "Overseas" &&
        frm.doc.place_of_supply === "96-Other Countries";

    if (frm.doctype === "Sales Invoice" && is_foreign_transaction) {
        fields.splice(5, 0, {
            label: "Origin Port / Border Checkpost Address",
            fieldname: "port_address",
            fieldtype: "Link",
            options: "Address",
            default: frm.doc.port_address,
            reqd: frm.doc?.__onload?.shipping_address_in_india != true,
            get_query: () => ({
                filters: { country: "India" },
            }),
        });
    }

    opts.fields = fields;

    frappe.ui.form.ControlData.trigger_change_on_input_event = false;
    const d = new frappe.ui.Dialog(opts);
    frappe.ui.form.ControlData.trigger_change_on_input_event = true;

    return d;
}
