import axios from 'axios';
import { getExtraction, writeResultOnJsonFile } from './utility';
import * as comuniItaliani from './places/comuniItaliani.json';
import { ShopsDocument, insertData } from './dbManagment';
import mongoose from 'mongoose';
import config, { IConfig } from 'config';


export class MapScraperClass {
    config: IConfig;
    apiKey: string;
    baseUrl: string;
    mappaRegioni: any;
    
    constructor(parent: any = undefined) {
        
        this.config = parent?.config || config;
        this.apiKey = ""; // Sostituisci con la tua chiave API di Google Maps
        this.baseUrl = "";
        this.mappaRegioni = comuniItaliani;
        
        
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
        
        const searchResultsByRegion: any = {};
        let nextPageToken = null;
        let trovato = false;
        const resultsPerPage = 20; // Numero di risultati per pagina
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
                if (query) params.query = query;
                
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
    async runMaps({ regioni = [], province = [], comuni: [], state = 'Italy', mode = 'standard', level = 'provincia', skipFinding = false, query = '', writeResult = true }: any) {
        // Se skipFinding è true, esegui direttamente l'inserimento dei dati
        if (skipFinding) return await insertData();
        
        // Ottieni le regioni o utilizza quelle predefinite
        
        let regione: any = '';
        let provincia: any = '';
        let byMaps: any = {};
        let res: any = {};
        let uuid = '';
        let skipProvinceFilter = regioni.length === 0;
        let skipComuniFilter = province.length === 0;
        
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
            regioni = Object.keys(comuniItaliani); 
        }
        
        let filteredRegions : any = {
            [state]:{}
        }
        
        regioni.forEach((el: any) =>  { 
            const normalizedRegionKey = this.normalizeName(el);
            const tempProvinceMap : any = this.mappaRegioni[normalizedRegionKey];
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
                })
                
            })
            
        }
        
        const regioniKeys = Object.keys(filteredRegions[state]);
        const rootState = filteredRegions[state];
        res[state] = {};
        
        // Ciclo per le regioni
        for (let i = 0; i < regioniKeys.length; i++) {
            const nomeRegione : string = regioniKeys[i];
            province = rootState[nomeRegione];
            
            res[state][nomeRegione] = {}
            
            const provinceKeys = Object.keys(province);
            const regionState = rootState[nomeRegione];
            
            // Ciclo per le province
            for (let j = 0; j < provinceKeys.length; j++) {
                
                const nomeProvincia : string = provinceKeys[j];
                provincia = regionState[nomeProvincia];
                uuid = provincia.uuid;
                
                res[state][nomeRegione][nomeProvincia] = {}
                
                
                let tt: any[] = [];
                let tempQuery = query;
                
                // Se il livello di dettaglio è "provincia", memorizza i dati in res
                if (level === 'provincia') {
                    console.log("Sto ottenendo dati per la regione: " + nomeRegione.toUpperCase() + " e provincia " + nomeProvincia.toUpperCase() + "\n")
                    
                    tempQuery = `${query} provincia ${nomeProvincia}`
                    
                    // Avvia la ricerca su Google Maps utilizzando startMaps() con la query specificata
                    byMaps = await this.startMaps({ query: tempQuery, filter: false, mode });
                    
                    
                    // Effettua trasformazioni e aggiunte ai dati ottenuti da Google Maps
                    byMaps.forEach((el: ShopsDocument) => {
                        el.provinciaID = nomeProvincia;
                        el.provinciaUUID = uuid;
                        el.state = state;
                        el.regione = nomeRegione;
                        tt.push(el);
                    })
                    
                    byMaps = tt;
                    
                    res[state][nomeRegione][nomeProvincia] = byMaps;
                                        
                    // Se la modalità è "mongo", trasforma e inserisce i dati in un database MongoDB
                    if (mode === 'mongo') {
                        res = this.transformForMongo({ data: res, level, state, province });
                        await insertData(res);
                    }
                    
                }
                else if (level === 'comune') {
                    
                    
                    const comuniRoot : any = filteredRegions[state][nomeRegione][nomeProvincia].comuni;
                    
                    // Ciclo per i comuni
                    for (let k = 0; k < comuniRoot?.length; k++) {

                        tt = [];
                        const nomeComune = comuniRoot[k];
                        const resRoot = res[state][nomeRegione][nomeProvincia];

                        if(!resRoot.comuni){
                            resRoot.comuni = {};
                        }
                        if(!resRoot.comuni[nomeComune]){
                            resRoot.comuni[nomeComune] = []
                        }
                        
                        tempQuery =  `${query}, ${nomeComune}, ${uuid}, ${state}`
                        
                        console.log("Sto ottenendo dati per la regione: " + nomeRegione.toUpperCase() + "\t Provincia: " + nomeProvincia.toUpperCase() + "\t Comune: " + nomeComune.toUpperCase() + "\n")
                        
                        const maps = await this.startMaps({ query: tempQuery, filter: false, mode, level });
                        
                        if (!maps) continue;
                        
                        byMaps = maps;
                        
                        byMaps.forEach((el: ShopsDocument) => {
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
                            const transformed = this.transformForMongo({ data: res, level, stateKeyParam: state, regionKeyParam: nomeRegione, provinceKeyParam: nomeProvincia, cityKeyParam: nomeComune })
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
                writeResultOnJsonFile(res, 'byMapsMongo');
                mongoose.disconnect();
            }
            else {
                writeResultOnJsonFile(res, level+'_byMaps');
                writeResultOnJsonFile(this.cleanExportData(res), level+'_clean_byMaps');
            }
            
        }
        
        
        // Restituisce l'oggetto contenente i dati estratti
        return res;
    }
    
    
    cleanExportData(data: any){
        const dataToReturn : any = {};
        
        Object.keys(data).forEach(stateName => {
            Object.keys(data[stateName]).forEach(regionName => {
                Object.keys(data[stateName][regionName]).forEach(provinciaName => {
                    Object.keys(data[stateName][regionName][provinciaName].comuni).forEach(comuneName => {
                        const tempComune: any = data[stateName][regionName][provinciaName].comuni[comuneName];
                        
                        if(!dataToReturn[stateName]) dataToReturn[stateName] = {};
                        if(!dataToReturn[stateName][regionName]) dataToReturn[stateName][regionName] = {};
                        if(!dataToReturn[stateName][regionName][provinciaName]) dataToReturn[stateName][regionName][provinciaName] = { comuni: {} };
                        if(!dataToReturn[stateName][regionName][provinciaName].comuni[comuneName]) dataToReturn[stateName][regionName][provinciaName].comuni[comuneName] = {};
                        
              
                        dataToReturn[stateName][regionName][provinciaName].comuni[comuneName] = tempComune.map((el: any) => { return {
                            business_status: el.business_status,
                            name: el.name, 
                            formatted_address: el.formatted_address,
                            geometry: el.geometry,
                            provinciaID: el.provinciaID,
                            provinciaUUID: el.provinciaUUID,
                            rating: el.rating,
                            reference: el.reference,
                            regione: el.regione,
                            state: el.state,
                        }});
                        
                    })
                })
            })
        })
        return dataToReturn
    }
    
    async getExportByMaps(fileName: string, clean = false){
        const data = await getExtraction(fileName);
        if(clean) return this.cleanExportData(data);
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