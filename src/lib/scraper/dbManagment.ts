import mongoose, { Schema, Document } from 'mongoose';
import fs from 'fs';

// Define the interface for your data (reshops with your actual schema)
export interface ShopsDocument extends Document {
    business_status: string;
    formatted_address: string;
    geometry: {
        location: {
            lat: number;
            lng: number;
        };
        viewport: {
            northeast: {
                lat: number;
                lng: number;
            };
            southwest: {
                lat: number;
                lng: number;
            };
        };
    };
    icon: string;
    icon_background_color: string;
    icon_mask_base_uri: string;
    name: string;
    opening_hours: {
        open_now: boolean;
    };
    photos: {
        height: number;
        html_attributions: string[];
        photo_reference: string;
        width: number;
    }[];
    shops_id: string;
    place_id: string;
    plus_code: {
        compound_code: string;
        global_code: string;
    };
    rating: number;
    reference: string;
    types: string[];
    user_ratings_total: number;
    provinciaID: string;
    provinciaUUID: string;
    state: string;
    regione: string;
    city: string;
}

// Define your Mongoose schema
const shopsSchema = new Schema<ShopsDocument>({
    business_status: String,
    formatted_address: String,
    geometry: {
        location: {
            lat: Number,
            lng: Number,
        },
        viewport: {
            northeast: {
                lat: Number,
                lng: Number,
            },
            southwest: {
                lat: Number,
                lng: Number,
            },
        },
    },
    icon: String,
    icon_background_color: String,
    icon_mask_base_uri: String,
    name: String,
    opening_hours: {
        open_now: Boolean,
    },
    photos: [
        {
            height: Number,
            html_attributions: [String],
            photo_reference: String,
            width: Number,
        },
    ],
    shops_id: String,
    plus_code: {
        compound_code: String,
        global_code: String,
    },
    rating: Number,
    reference: String,
    types: [String],
    user_ratings_total: Number,
    place_id: String,
    provinciaID: String,
    provinciaUUID: String,
    state: String,
    regione: String,
    city: String
});

// Create a Mongoose model
const Shops = mongoose.model<ShopsDocument>('Shops', shopsSchema);

shopsSchema.index({ formatted_address: 1, name: 1 }, { unique: true });
shopsSchema.index({ 'geometry.location': '2dsphere' });

// Connect to your MongoDB database

// Read the JSON file

// Insert data from JSON into the MongoDB collection


export async function insertData(data: any = null) {


    console.log("\nInserting data into MongoDB\n");

    const currentDate = new Date().toISOString().split('T')[0];


    let file = null;

    if (!data) {
        try {
            file = fs.readFileSync(`./data/byMapsMongo_${currentDate}.json`, 'utf-8')
        }
        catch (e) {
            console.warn("\nNo file found\n")

        }
    }


    const jsonData = (file) ? data || JSON.parse(file) || null : data || null;

    if (!jsonData || !jsonData.length) {
        console.warn("\nEmpty data and no file found\n");
        return null;
    }


    try {
        const result = await Shops.insertMany(jsonData);
        console.log("\nData inserted successfully\n");
    }
    catch (err: any) {
        console.warn("\nData inserted failed: \n", err?.message + "\n");

    }

}