import axios from 'axios';
import { getExtraction, writeResultOnJsonFile } from './utility';
import * as regioniItaliane from './places/regioniItaliane.json';
import { ShopsDocument, insertData } from './dbManagment';
import mongoose from 'mongoose';
import config, { IConfig } from 'config';
import { ComuneResult, MapQueryResult, MapQueryResults, ProvinciaComuneResult, RegioneResult, ScrapingResultMap, StateResult } from './index.d';


interface RunMapsParams {
    regioni?: string[],
    province?: string[],
    comuni?: string[],
    state?: string,
    mode?: string,
    level?: string,
    skipFinding?: boolean,
    query?: string,
    writeResult?: boolean
}

export class MapScraperClass {
    config: IConfig;
    apiKey: string;
    baseUrl: string;
    mappaRegioniItaliane: any;
    
    constructor(parent: any = undefined) {
        
        this.config = parent?.config || config;
        this.apiKey = ""; // Sostituisci con la tua chiave API di Google Maps
        this.baseUrl = "";
        this.mappaRegioniItaliane = regioniItaliane;
        
        
        this.init();    
        
    }
    
    init() {
        this.initDependencies();
    }
    
    initDependencies() {
        this.apiKey = this.config.get('application.googleKeys.maps.key');   
        this.baseUrl = this.config.get('application.googleKeys.maps.baseUrl');   
    }
    
    
    
    async startMaps({ query = '', latitude, longitude, radius, filter }: any): Promise<any> {
        
        let nextPageToken = null;
        let trovato = false;
        let res: any[] = [];
        let i = 0;
        
        try {
            while (!trovato) {
                
                const params: any = {
                    key: this.apiKey,
                    ...(nextPageToken && { pagetoken: nextPageToken }), // Aggiungi il token di paginazione se presente
                };
                
                if (latitude && longitude) params.location = `${latitude},${longitude}`;
                if (radius) params.radius = radius;
                if (query) params.query = query.replace(/[^a-zA-Z]+/g, ' ').toLowerCase();;
                
                if(!params.query && !params.location && !params.radius) {
                    throw new Error("Parametri mancanti");
                }
                //if (level === 'comune') params.radius = 15000;
                
                console.log(`Ricerca in corso con query: ${params.query}`);
                
                const response: any = await axios.get(this.baseUrl, { params });
                
                
                // Elabora la risposta qui
                const t = response.data.results;
                
                res = [...res, ...t];
                
                // Ottieni il token di paginazione per la prossima pagina di risultati
                nextPageToken = response.data.next_page_token;
                
                console.log(`Ricerca per query: ${params.query}, risultati: ${t.length}, paginazione: ${nextPageToken ? 'presente' : 'nessuna'}`);
                
                if (!nextPageToken) trovato = true;
                
                await new Promise((resolve) => setTimeout(resolve, 2000));
                
                i++;
            };
        } catch (error) {
            console.error(`Si è verificato un errore nella ricerca: `, error);
        }
        
        
        
        return res;
    }
    
    
    normalizeName(name: string) {
        return name.replace(/[^a-zA-Z]+/g, '_').toLowerCase();
    }
    
    
    /**
    * Runs the maps scraper to extract data from Google Maps based on the specified regions, state, mode, and level.
    *
    * @param {Object} options - The options for running the maps scraper.
    * @param {Object} options.regions - An object containing the regions and their data. If not provided, the default Italian regions will be used.
    * @param {string} options.state - The state of reference (default: 'Italy').
    * @param {string} options.mode - The execution mode (default: 'standard').
    * @param {string} options.level - The level of detail (default: 'provincia').
    * @param {boolean} options.skipFinding - Flag to skip the search and directly insert the data (default: false).
    * @param {string} options.query - The query for the search (default: '').
    * @param {boolean} options.writeResult - Flag to write the result to a JSON file (default: false).
    * @return {Promise<Object>} - An object containing the extracted data from Google Maps.
    */
    async runMaps({ 
        regioni = [], 
        province = [], 
        comuni = [], 
        state = 'Italy', 
        mode = 'standard', 
        level = 'provincia', 
        skipFinding = false, 
        query = '', 
        writeResult = true 
    }: RunMapsParams) : Promise<ScrapingResultMap | undefined | null>{
        // Se skipFinding è true, esegui direttamente l'inserimento dei dati
        if (skipFinding) return await insertData();
        
        // Ottieni le regioni o utilizza quelle predefinite
        let provincia: any = '';
        let result: ScrapingResultMap = {};
        let uuid = '';
        let skipProvinceFilter = regioni.length === 0;
        let skipComuniFilter = (skipProvinceFilter && comuni.length === 0);
        state = this.normalizeName(state);
        
        if (writeResult && mode === 'mongo') {
            try {
                mongoose.connect(`${process.env.MDB_URI}`);
            }
            catch (e) {
                console.error("Database connection failed");
                return null;
            }
        }
        
        if(skipProvinceFilter) {
            regioni = Object.keys(this.mappaRegioniItaliane); 
        }
        
        let filteredRegions : any = {
            [state]:{}
        }
        
        regioni.forEach((el: any) =>  { 
            const normalizedRegionKey = this.normalizeName(el);
            const tempProvinceMap : any = this.mappaRegioniItaliane[normalizedRegionKey];
            const tempProvinceMapEntries = Object.entries(tempProvinceMap);
            const tempProvince : any = {}
            tempProvinceMapEntries.forEach(([k,v] : [string, any]) => {
                tempProvince[this.normalizeName(k)] = {
                    ...v,
                    'comuni': v.comuni?.map((el: any) => this.normalizeName(el)) || [],
                } 
            })     
            
            filteredRegions[state][normalizedRegionKey] = tempProvince;
        });
        
        
        
        
        if(!skipProvinceFilter){
            
            Object.keys(filteredRegions[state]).forEach((regionKey: any, index: number) => {
                const provinceLocal = filteredRegions[state][regionKey];
                const provinceFilteredKeys = Object.keys(provinceLocal).filter((key: any) => {
                    return province.map((el : any) => el = this.normalizeName(el)).includes((this.normalizeName(key)));
                })
                
                
                Object.keys(provinceLocal).forEach((key: any) => {
                    if(!provinceFilteredKeys.includes(key)){
                        delete filteredRegions[state][regionKey][key];
                    }
                    
                    if(!skipComuniFilter){
                        comuni = comuni.map((el : any) => this.normalizeName(el));
                        let tempComuni = filteredRegions[state][regionKey][key]?.comuni;
                        let temp = new Set();
                        if(tempComuni && tempComuni.length > 0){
                            tempComuni.forEach((elComune: string) => {
                                if(comuni.includes(this.normalizeName(elComune)))
                                    temp.add(elComune);
                            });
                            filteredRegions[state][regionKey][key].comuni = [...temp];
                        }
                    }
                    
                })
                
            })
        }
        
        const regioniKeys = Object.keys(filteredRegions[state]);
        const rootState = filteredRegions[state];
        result[state] = {};
        
        // Ciclo per le regioni
        for (let i = 0; i < regioniKeys.length; i++) {
            const nomeRegione : string = regioniKeys[i];
            province = rootState[nomeRegione];
            
            result[state][nomeRegione] = {};
            
            const provinceKeys = Object.keys(province);
            const regionState = rootState[nomeRegione];
            
            // Ciclo per le province
            for (let j = 0; j < provinceKeys.length; j++) {
                
                const nomeProvincia : string = provinceKeys[j];
                provincia = regionState[nomeProvincia];
                uuid = provincia.uuid;
                
                result[state][nomeRegione][nomeProvincia] = [] as MapQueryResults;
                
                
                let tt: any[] = [];
                let tempQuery = query;
                
                // Se il livello di dettaglio è "provincia", memorizza i dati in result
                if (level === 'provincia') {
                    console.log("Sto ottenendo dati per la regione: " + nomeRegione.toUpperCase() + " e provincia " + nomeProvincia.toUpperCase() + "\n")
                    
                    tempQuery = `${query} provincia ${nomeProvincia}`
                    
                    // Avvia la ricerca su Google Maps utilizzando startMaps() con la query specificata
                    let byMaps : MapQueryResults = await this.startMaps({ query: tempQuery, filter: false, mode });
                    
                    
                    // Effettua trasformazioni e aggiunte ai dati ottenuti da Google Maps
                    byMaps.forEach((el: MapQueryResult) => {
                        el.provinciaID = nomeProvincia;
                        el.provinciaUUID = uuid;
                        el.state = state;
                        el.regione = nomeRegione;
                        tt.push(el);
                    })
                    
                    byMaps = tt;
                    
                    result[state][nomeRegione][nomeProvincia] = byMaps;
                    
                    // Se la modalità è "mongo", trasforma e inserisce i dati in un database MongoDB
                    if (mode === 'mongo') {
                        this.transformForMongo({ data: result, level, state, province });
                        await insertData(result);
                    }
                    
                }
                else if (level === 'comune') {
                    
                    
                    const comuniRoot : any = filteredRegions[state][nomeRegione][nomeProvincia].comuni;
                    
                    // Ciclo per i comuni
                    for (let k = 0; k < comuniRoot?.length; k++) {
                        
                        tt = [];
                        const nomeComune = comuniRoot[k];
                        const resRoot : ProvinciaComuneResult = result[state][nomeRegione][nomeProvincia] as ProvinciaComuneResult;
                        
                        if(!resRoot.comuni){
                            resRoot.comuni = {};
                        }
                        if(!resRoot.comuni[nomeComune]){
                            resRoot.comuni[nomeComune] = []
                        }
                        
                        tempQuery =  `${query}, ${nomeComune}, ${uuid}, ${state}`
                        
                        console.log("Sto ottenendo dati per la regione: " + nomeRegione.toUpperCase() + "\t Provincia: " + nomeProvincia.toUpperCase() + "\t Comune: " + nomeComune.toUpperCase() + "\n")
                        
                        let byMaps : MapQueryResults = await this.startMaps({ query: tempQuery, filter: false, mode, level });
                        
                        if (!byMaps) continue;
                        
                        byMaps.forEach((el: MapQueryResult) => {
                            el.provinciaID = nomeProvincia;
                            el.provinciaUUID = uuid;
                            el.state = state;
                            el.regione = nomeRegione;
                            el.city = nomeComune;
                            tt.push(el);
                        })
                        
                        byMaps = tt;
                        
                        resRoot.comuni[nomeComune] = byMaps;
                        
                        // Se la modalità è "mongo", trasforma e inserisce i dati in un database MongoDB
                        if ( writeResult && mode === 'mongo') {
                            const transformed = this.transformForMongo({ data: result, level, stateKeyParam: state, regionKeyParam: nomeRegione, provinceKeyParam: nomeProvincia, cityKeyParam: nomeComune })
                            await insertData(transformed);
                        }
                    }
                }
                console.log(`Provincia ${nomeProvincia} scanned successfully\n`);
            }
            console.log(`Regione ${nomeRegione} scanned successfully\n`);
        }
        
        
        if(writeResult){
            // Se la modalità non è "mongo", scrive i dati in un file JSON
            if (mode === 'mongo') {
                writeResultOnJsonFile(result, 'byMapsMongo');
                mongoose.disconnect();
            }
            else {
                writeResultOnJsonFile(result, level+'_byMaps');
                writeResultOnJsonFile(this.cleanExportData(result), level+'_clean_byMaps');
            }
            
        }
        
        
        // Restituisce l'oggetto contenente i dati estratti
        return result;
    }
    
    
    mapResultKeys(){
        
    }
    
    
    
    /**
    * Filtra i campi dell'oggetto di tipo MapQueryResults.
    * @param data Oggetto ScrapingResultMap da filtrare.
    * @param fields Array di stringhe contenente i nomi dei campi da mantenere.
    * @returns Un nuovo oggetto ScrapingResultMap filtrato.
    */
    cleanExportData(data: ScrapingResultMap, fields: string[] = []): ScrapingResultMap {
        const cleanedData: ScrapingResultMap = {};
        
        // Iteriamo sugli stati
        for (const stateKey in data) {
            if (Object.prototype.hasOwnProperty.call(data, stateKey)) {
                const state = data[stateKey];
                const cleanedState: StateResult = {};
                
                // Iteriamo sulle regioni
                for (const regioneKey in state) {
                    if (Object.prototype.hasOwnProperty.call(state, regioneKey)) {
                        const regione = state[regioneKey];
                        const cleanedRegione: RegioneResult = {};
                        
                        // Iteriamo sulle province o comuni
                        for (const provinciaKey in regione) {
                            if (Object.prototype.hasOwnProperty.call(regione, provinciaKey)) {
                                const provincia = regione[provinciaKey];
                                
                                // Filtriamo MapQueryResults se è un array
                                if (Array.isArray(provincia)) {
                                    const cleanedProvincia: MapQueryResults = provincia.map((item) => {
                                        return this.filterFields(item, fields);
                                    });
                                    cleanedRegione[provinciaKey] = cleanedProvincia;
                                } else {
                                    // Altrimenti è ProvinciaComuneResult
                                    const cleanedProvincia: ProvinciaComuneResult = {
                                        uuid: provincia.uuid,
                                        comuni: this.filterComuni(provincia.comuni, fields),
                                    };
                                    cleanedRegione[provinciaKey] = cleanedProvincia;
                                }
                            }
                        }
                        
                        cleanedState[regioneKey] = cleanedRegione;
                    }
                }
                
                cleanedData[stateKey] = cleanedState;
            }
        }
        
        return cleanedData;
    }
    
    /**
    * Funzione ausiliaria per filtrare i campi di un oggetto MapQueryResult.
    * @param item Oggetto MapQueryResult da filtrare.
    * @param fields Array di stringhe contenente i nomi dei campi da mantenere.
    * @returns Oggetto MapQueryResult filtrato.
    */
    filterFields(item: MapQueryResult, fields: string[]): MapQueryResult {
        const filteredItem: MapQueryResult = {};
        
        for (const field of fields) {
            if (item.hasOwnProperty(field)) {
                filteredItem[field] = item[field];
            }
        }
        
        return filteredItem;
    }
    
    /**
    * Funzione ausiliaria per filtrare i comuni di un oggetto ComuneResult.
    * @param comuni Oggetto ComuneResult da filtrare.
    * @param fields Array di stringhe contenente i nomi dei campi da mantenere.
    * @returns Oggetto ComuneResult filtrato.
    */
    filterComuni(comuni: ComuneResult | undefined, fields: string[]): ComuneResult | undefined {
        if (!comuni) return undefined;
        
        const filteredComuni: ComuneResult = {};
        
        for (const comuneKey in comuni) {
            if (Object.prototype.hasOwnProperty.call(comuni, comuneKey)) {
                const comune = comuni[comuneKey];
                const filteredComune: MapQueryResults = comune.map((item) => {
                    return this.filterFields(item, fields);
                });
                filteredComuni[comuneKey] = filteredComune;
            }
        }
        
        return filteredComuni;
    }
    
    //     cleanExportData(data: ScrapingResultMap, fields: string[] = []): ScrapingResultMap {
    //     const dataToReturn: ScrapingResultMap = {};
    
    //     Object.keys(data).forEach(stateName => {
    //         if (!dataToReturn[stateName]) dataToReturn[stateName] = {};
    
    //         Object.keys(data[stateName]).forEach(regionName => {
    //             if (!dataToReturn[stateName][regionName]) dataToReturn[stateName][regionName] = {};
    
    //             Object.keys(data[stateName][regionName]).forEach(provinciaName => {
    //                 const provinciaData: ProvinciaComuneResult = data[stateName][regionName][provinciaName];
    //                 const comuni: ComuneResult | undefined = provinciaData.comuni;
    
    //                 if (comuni) {
    //                     Object.keys(comuni).forEach(current => {
    //                         const searchResults: MapQueryResults = comuni[current];
    
    //                         if (!dataToReturn[stateName][regionName][provinciaName]) {
    //                             dataToReturn[stateName][regionName][provinciaName] = {
    //                                 comuni: {}
    //                             };
    //                         }
    
    //                         if (!dataToReturn[stateName][regionName][provinciaName].comuni[current]) {
    //                             dataToReturn[stateName][regionName][provinciaName].comuni[current] = [];
    //                         }
    
    //                         dataToReturn[stateName][regionName][provinciaName].comuni[current] = searchResults.map(result => {
    //                             const temp: MapQueryResult = {};
    //                             Object.keys(result).forEach(key => {
    //                                 if (fields.length === 0 || fields.includes(key)) {
    //                                     temp[key] = result[key];
    //                                 }
    //                             });
    //                             return temp;
    //                         });
    //                     });
    //                 } else {
    //                     const provinciaResults: MapQueryResults = provinciaData as MapQueryResults;
    
    //                     if (!dataToReturn[stateName][regionName][provinciaName]) {
    //                         dataToReturn[stateName][regionName][provinciaName] = {
    //                             comuni: {}
    //                         };
    //                     }
    
    //                     dataToReturn[stateName][regionName][provinciaName].comuni = provinciaResults.map(current => {
    //                         const temp: MapQueryResult = {};
    //                         Object.keys(current).forEach(key => {
    //                             if (fields.length === 0 || fields.includes(key)) {
    //                                 temp[key] = current[key];
    //                             }
    //                         });
    //                         return temp;
    //                     });
    //                 }
    //             });
    //         });
    //     });
    
    //     return dataToReturn;
    // }
    
    async getExportByMaps(fileName: string, clean = false, fields = []) {
        const data = await getExtraction(fileName);
        if(clean) return this.cleanExportData(data, fields);
        return data;
    }
    
    
    /**
    * Trasforma i dati per l'inserimento in un database MongoDB.
    * @param {Object} options - Opzioni per la trasformazione.
    * @param {Object} options.data - I dati da trasformare.
    * @param {string} options.level - Il livello di dettaglio (default: 'provincia').
    * @param {string} options.stateKeyParam - Il parametro chiave per lo stato.
    * @param {string} options.regionKeyParam - Il parametro chiave per la regione.
    * @param {string} options.provinceKeyParam - Il parametro chiave per la provincia.
    * @param {string} options.cityKeyParam - Il parametro chiave per la città (comune).
    * @returns {Array} - Un array contenente i dati trasformati pronti per l'inserimento in MongoDB.
    */
    transformForMongo({ data, level = 'provincia', provinces = null , stateKeyParam, regionKeyParam, provinceKeyParam, cityKeyParam }: any) {
        console.log("Transforming data for Mongo");
        
        let result: any[] = [];
        
        const statesKeys = [stateKeyParam] || Object.keys(data);
        let regionsKeys = [regionKeyParam] || null;
        let provincesKeys = [provinceKeyParam] || null;
        let region = null;
        let province = provinces;
        let city: any = null;
        
        //CICLA SUGLI STATI
        statesKeys.forEach((stateKey) => {
            
            if (!regionsKeys) regionsKeys = Object.keys(data[stateKey]);
            //CICLA SULLE REGIONI
            regionsKeys.forEach((regionKey) => {
                
                region = data[stateKey][regionKey];
                
                if (!provincesKeys) provincesKeys = Object.keys(region);
                
                //CICLA SULLE PROVINCE
                provincesKeys.forEach((provincesKey) => {
                    
                    try {
                        province = data[stateKey][regionKey][provincesKey];
                        
                        if (level === 'comune') {
                            let comuniKeys = [cityKeyParam] || Object.keys(province.comuni);
                            //CICLA SUI COMUNI
                            comuniKeys.forEach((comuneKey) => {
                                city = data[stateKey][regionKey][provincesKey].comuni[comuneKey];
                                result = [...result, ...city];
                            })
                        }
                        else {
                            if (province && typeof province === 'object') result = [...result, ...province];
                        }
                    }
                    catch (e) {
                    }
                    
                })
            })
        })
        
        
        
        return result;
    }
    
}