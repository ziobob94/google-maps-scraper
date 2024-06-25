export type RegionData = {
    id: string,
    url: string,
    pages: any
} | null ;


export interface ScraperArgv{
    mode: string,
    filter: boolean,
    onlyMaps: boolean,
    skipFinding: boolean,
    level: string,
    query: string
}


export type Provincia =  {
    uuid: string;
    comuni: string[];
}

export type ProvinciaMap = Record<string, Provincia>;

export type RegioneMap = Record<string, ProvinciaMap>;

export type RegioniItalianeMap = Record<string, RegioneMap>;

export type StateMap = Record<string, RegioneMap>;

export type RegioniItalianeMapState = Record<string, StateMap>;


interface MapQueryResult {
    business_status?: string;
    formatted_address?: string;
    geometry?: {
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
    icon?: string;
    icon_background_color?: string;
    icon_mask_base_uri?: string;
    name?: string;
    opening_hours?: {
        open_now: boolean;
    };
    photos?: {
        height: number;
        html_attributions: string[];
        photo_reference: string;
        width: number;
    }[];
    shops_id?: string;
    place_id?: string;
    plus_code?: {
        compound_code: string;
        global_code: string;
    };
    rating?: number;
    reference?: string;
    types?: string[];
    user_ratings_total?: number;
    provinciaID?: string;
    provinciaUUID?: string;
    state?: string;
    regione?: string;
    city?: string;
    [key: string]: any; // Aggiunta della firma dell'indice
}

export type ProvinciaComuneResult = {
    uuid?: string;
    comuni?: ComuneResult
};


export type MapQueryResults = MapQueryResult[];

export type ComuneResult = Record<string, MapQueryResults>;

export type ProvinciaResult = ProvinciaComuneResult | MapQueryResults;

export type RegioneResult = Record<string, ProvinciaResult>;

export type StateResult = Record<string, RegioneResult>;

export type ScrapingResultMap = Record<string, StateResult>;