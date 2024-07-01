;
import mongoose, { Schema, Document } from "mongoose";
import { MapQueryResult } from "../../../lib/scraper/index.d";

export const EstateAgencySchema: Schema = new Schema({
    business_status: { type: String },
    formatted_address: { type: String },
    geometry: {
        location: {
            lat: { type: Number },
            lng: { type: Number },
        },
        viewport: {
            northeast: {
                lat: { type: Number },
                lng: { type: Number },
            },
            southwest: {
                lat: { type: Number },
                lng: { type: Number },
            },
        },
    },
    icon: { type: String },
    icon_background_color: { type: String },
    icon_mask_base_uri: { type: String },
    name: { type: String },
    opening_hours: {
        open_now: { type: Boolean },
    },
    photos: [
        {
            height: { type: Number },
            html_attributions: { type: [String] },
            photo_reference: { type: String },
            width: { type: Number },
        },
    ],
    shops_id: { type: String },
    place_id: { type: String },
    plus_code: {
        compound_code: { type: String },
        global_code: { type: String },
    },
    rating: { type: Number },
    reference: { type: String },
    types: { type: [String] },
    user_ratings_total: { type: Number },
    provinciaID: { type: String },
    provinciaUUID: { type: String },
    state: { type: String },
    regione: { type: String },
    comune: { type: String },
    city: { type: String },
}, { strict: false }); // Using strict: false to allow additional fields

EstateAgencySchema.index({ place_id: 1 }, { unique: true });
